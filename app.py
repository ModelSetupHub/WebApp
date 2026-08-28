"""
Model Setup Hub — GUI

Flask entrypoint. Serves the dashboard and exposes a thin JSON API over the
`core` submodule.

Wired so far:
    /api/system            -> core.System.scanner
    /api/ollama/status     -> core.ollama.runtime
    /api/ollama/models/*   -> core.ollama.model

The core functions return raw Ollama CLI text. Parsing that text into rows the
browser can render is this layer's job, so the submodule stays untouched.
"""

from datetime import datetime
import json
import re
import threading
import urllib.error

from flask import Flask, jsonify, render_template, request

from core.ollama import model as ollama_model
from core.ollama import runtime as ollama_runtime
from core.System.scanner import scan_system

app = Flask(__name__)


# ---------------------------------------------------------------------------
# Envelope helpers
# ---------------------------------------------------------------------------

# The Ollama CLI writes spinner frames and colour codes to its output even when
# it is not attached to a terminal, so strip them before anything is displayed.
ANSI_ESCAPE = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]|\x1B[@-Z\\-_]")
SPINNER_CHARS = re.compile(r"[⠁-⣿]")


def clean_cli_text(value):
    """Strip terminal control sequences and spinner frames from CLI output.

    Non-string values pass through untouched so JSON payloads from the Ollama
    HTTP API are not mangled.

    Args:
        value: Text from a CLI command, or any other value.

    Returns:
        The cleaned string, or the original value when it is not a string.
    """
    if not isinstance(value, str):
        return value

    text = ANSI_ESCAPE.sub("", value)
    text = SPINNER_CHARS.sub("", text)

    # Progress output redraws one line with carriage returns; only the final
    # state of each line is meaningful once the sequences are gone.
    lines = [line.split("\r")[-1].rstrip() for line in text.splitlines()]

    return "\n".join(line for line in lines if line.strip()).strip()


def ok(data=None, **extra):
    """Build a success envelope."""
    return jsonify({"ok": True, "error": None, "data": clean_cli_text(data), **extra})


def fail(error: str, status: int = 500):
    """Build a failure envelope with an HTTP status."""
    return jsonify({"ok": False, "error": clean_cli_text(error), "data": None}), status


def call_core(action, *args, **kwargs):
    """Run a core function and translate any exception into an envelope.

    Core raises ValueError/FileNotFoundError for bad input and RuntimeError
    when the Ollama CLI itself fails, so the first group maps to 400 and the
    rest to 500.
    """
    try:
        return ok(action(*args, **kwargs))
    except (ValueError, TypeError, FileNotFoundError) as error:
        return fail(f"{type(error).__name__}: {error}", 400)
    except Exception as error:
        return fail(f"{type(error).__name__}: {error}", 500)


def body() -> dict:
    """Return the request JSON body, tolerating an empty payload."""
    return request.get_json(silent=True) or {}


# ---------------------------------------------------------------------------
# System
# ---------------------------------------------------------------------------

# A full scan shells out to PowerShell and nvidia-smi, so it costs a few
# seconds. Serve a cached profile and let the UI ask for a fresh one.
_scan_lock = threading.Lock()
_scan_cache: dict | None = None


def get_system_info(force_refresh: bool = False) -> dict:
    """Return the core system profile wrapped in a transport envelope.

    Args:
        force_refresh: Re-run the scan instead of serving the cached profile.

    Returns:
        dict: ``ok``/``error``/``profile``/``scanned_at``/``cached`` envelope.
    """
    global _scan_cache

    with _scan_lock:
        if _scan_cache is not None and not force_refresh:
            return {**_scan_cache, "cached": True}

        try:
            profile = scan_system()
        except Exception as error:
            return {
                "ok": False,
                "error": f"{type(error).__name__}: {error}",
                "profile": None,
                "scanned_at": None,
                "cached": False,
            }

        _scan_cache = {
            "ok": True,
            "error": None,
            "profile": profile,
            "scanned_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        return {**_scan_cache, "cached": False}


@app.route("/")
def dashboard():
    return render_template("dashboard.html")


@app.route("/api/system")
def api_system():
    refresh = request.args.get("refresh") in ("1", "true", "yes")
    payload = get_system_info(force_refresh=refresh)

    return jsonify(payload), 200 if payload["ok"] else 503


# ---------------------------------------------------------------------------
# Ollama CLI text parsing
# ---------------------------------------------------------------------------

# The CLI pads columns with runs of spaces, so two or more spaces is the
# separator and a single space stays part of a value.
COLUMN_SPLIT = re.compile(r"\s{2,}")


def parse_cli_table(text: str) -> dict:
    """Parse a padded Ollama CLI table into headers and row dicts.

    Args:
        text: Raw stdout from a command such as ``ollama list``.

    Returns:
        dict: ``{"columns": [...], "rows": [{...}], "raw": text}``. A table with
            only a header line yields an empty ``rows`` list.
    """
    lines = [line for line in clean_cli_text(text).splitlines() if line.strip()]

    if not lines:
        return {"columns": [], "rows": [], "raw": text or ""}

    columns = [col.strip().lower() for col in COLUMN_SPLIT.split(lines[0].strip())]
    rows = []

    for line in lines[1:]:
        values = [value.strip() for value in COLUMN_SPLIT.split(line.strip())]
        rows.append({
            columns[index]: values[index] if index < len(values) else ""
            for index in range(len(columns))
        })

    return {"columns": columns, "rows": rows, "raw": text or ""}


def parse_model_info(text: str) -> dict:
    """Parse ``ollama show`` output into titled sections of key/value pairs.

    The command prints section titles followed by more deeply indented entries
    that are either ``key   value`` pairs or bare flags such as capability
    names. Title indentation is not consistent between sections, so the deepest
    indent level is treated as the entries and anything shallower as a title.

    Args:
        text: Raw stdout from ``ollama show``.

    Returns:
        dict: ``{"sections": [{"title": str, "rows": [[key, value]]}], "raw": text}``
    """
    lines = [line for line in (text or "").splitlines() if line.strip()]

    if not lines:
        return {"sections": [], "raw": text or ""}
    indents = [len(line) - len(line.lstrip()) for line in lines]
    entry_indent = max(indents)

    sections: list[dict] = []
    current: dict | None = None

    for line, indent in zip(lines, indents):
        if indent < entry_indent:
            current = {"title": line.strip(), "rows": []}
            sections.append(current)
            continue

        if current is None:
            current = {"title": "Details", "rows": []}
            sections.append(current)

        parts = COLUMN_SPLIT.split(line.strip(), maxsplit=1)
        key = parts[0].strip()
        value = parts[1].strip() if len(parts) > 1 else ""
        current["rows"].append([key, value])

    return {"sections": sections, "raw": text or ""}


def describe_error(error: Exception) -> str:
    """Build the most specific message available for a core exception.

    ``core.ollama.model.load_model`` re-raises HTTP failures as a generic
    RuntimeError, so the Ollama API's own explanation only survives on the
    chained cause. Read it back when it is there.

    Args:
        error: Exception raised by a core call.

    Returns:
        str: Error text, including the upstream Ollama message when available.
    """
    message = f"{type(error).__name__}: {error}"
    cause = error.__cause__

    if isinstance(cause, urllib.error.HTTPError):
        try:
            detail = json.loads(cause.read().decode("utf-8")).get("error")
        except Exception:
            detail = None

        if detail:
            return f"{message} — {detail}"

    return message


# ---------------------------------------------------------------------------
# Ollama runtime
# ---------------------------------------------------------------------------

@app.route("/api/ollama/status")
def api_ollama_status():
    return call_core(ollama_runtime.get_status)


@app.route("/api/ollama/start", methods=["POST"])
def api_ollama_start():
    payload = body()
    timeout = payload.get("timeout", ollama_runtime.START_TIMEOUT)

    try:
        timeout = float(timeout)
    except (TypeError, ValueError):
        return fail("Timeout must be a number", 400)

    try:
        ollama_runtime.start(timeout)
    except RuntimeError as error:
        return fail(str(error), 502)
    except Exception as error:
        return fail(f"{type(error).__name__}: {error}")

    # Report the state the caller should now render, not just a success flag.
    return ok(ollama_runtime.get_status())


@app.route("/api/ollama/stop", methods=["POST"])
def api_ollama_stop():
    payload = body()
    timeout = payload.get("timeout", ollama_runtime.STOP_TIMEOUT)

    try:
        timeout = float(timeout)
    except (TypeError, ValueError):
        return fail("Timeout must be a number", 400)

    try:
        ollama_runtime.stop(timeout)
    except RuntimeError as error:
        return fail(str(error), 502)
    except Exception as error:
        return fail(f"{type(error).__name__}: {error}")

    status = ollama_runtime.get_status()

    # core stops the server process, but the Ollama desktop/tray app supervises
    # it and starts a fresh one immediately. Report that instead of claiming a
    # stop that did not stick.
    return ok(status, restarted=status["running"])


@app.route("/api/ollama/install", methods=["POST"])
def api_ollama_install():
    installer = (body().get("installer_path") or "").strip()

    if not installer:
        return fail("A path to the Ollama installer is required", 400)

    try:
        ollama_runtime.install(installer)
    except FileNotFoundError as error:
        return fail(str(error), 400)
    except Exception as error:
        return fail(f"{type(error).__name__}: {error}")

    return ok(ollama_runtime.get_status())


# ---------------------------------------------------------------------------
# Ollama models
# ---------------------------------------------------------------------------

@app.route("/api/ollama/models")
def api_models_list():
    try:
        return ok(parse_cli_table(ollama_model.list_models()))
    except Exception as error:
        return fail(f"{type(error).__name__}: {error}")


@app.route("/api/ollama/models/running")
def api_models_running():
    try:
        return ok(parse_cli_table(ollama_model.list_running_models()))
    except Exception as error:
        return fail(f"{type(error).__name__}: {error}")


@app.route("/api/ollama/models/info")
def api_model_info():
    name = (request.args.get("model") or "").strip()

    if not name:
        return fail("A model name is required", 400)

    try:
        return ok(parse_model_info(ollama_model.show_model_info(name)))
    except RuntimeError as error:
        return fail(str(error), 502)
    except Exception as error:
        return fail(f"{type(error).__name__}: {error}")


@app.route("/api/ollama/models/add", methods=["POST"])
def api_model_add():
    payload = body()
    name = (payload.get("model_name") or "").strip()
    path = (payload.get("model_path") or "").strip()

    if not name or not path:
        return fail("Both a model name and a model file path are required", 400)

    return call_core(ollama_model.add_model, name, path)


@app.route("/api/ollama/models/remove", methods=["POST"])
def api_model_remove():
    name = (body().get("model") or "").strip()

    if not name:
        return fail("A model name is required", 400)

    return call_core(ollama_model.remove_model, name)


@app.route("/api/ollama/models/run", methods=["POST"])
def api_model_run():
    payload = body()
    name = (payload.get("model") or "").strip()
    prompt = payload.get("prompt") or ""

    if not name:
        return fail("A model name is required", 400)

    if not prompt.strip():
        return fail("A prompt is required", 400)

    return call_core(ollama_model.run_model, name, prompt)


@app.route("/api/ollama/models/stop", methods=["POST"])
def api_model_stop():
    name = (body().get("model") or "").strip()

    if not name:
        return fail("A model name is required", 400)

    return call_core(ollama_model.stop_model, name)


@app.route("/api/ollama/models/load", methods=["POST"])
def api_model_load():
    payload = body()
    name = (payload.get("model") or "").strip()
    keep_alive = (payload.get("keep_alive") or "10m").strip()

    if not name:
        return fail("A model name is required", 400)

    try:
        result = ollama_model.load_model(name, keep_alive)
    except (ValueError, TypeError) as error:
        return fail(f"{type(error).__name__}: {error}", 400)
    except Exception as error:
        return fail(describe_error(error))

    # core returns None when the model was already resident in memory.
    if result is None:
        return ok(None, already_loaded=True)

    return ok(result, already_loaded=False)


@app.route("/api/ollama/models/configure", methods=["POST"])
def api_model_configure():
    payload = body()
    source = (payload.get("source_model") or "").strip()
    target = (payload.get("target_model") or "").strip()
    parameters = payload.get("parameters")

    if not source or not target:
        return fail("Both a source and a target model name are required", 400)

    if not isinstance(parameters, dict) or not parameters:
        return fail("At least one configuration parameter is required", 400)

    return call_core(ollama_model.configure_model, source, target, parameters)


if __name__ == "__main__":
    app.run(debug=True, port=5000)

