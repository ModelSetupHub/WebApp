"""JSON transport envelope shared by every API route.

Every endpoint answers with the same shape so the browser has one code path for
success and failure:

    {"ok": bool, "error": str | None, "data": Any, ...extra}
"""

import json
import re
import urllib.error

from flask import jsonify, request

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
    """Build a success envelope.

    Args:
        data: Payload for the caller.
        **extra: Additional top-level keys, such as ``already_loaded``.

    Returns:
        flask.Response: JSON response with HTTP 200.
    """
    return jsonify({"ok": True, "error": None, "data": clean_cli_text(data), **extra})


def fail(error: str, status: int = 500):
    """Build a failure envelope with an HTTP status.

    Args:
        error: Message to show the user.
        status: HTTP status code. Defaults to 500.

    Returns:
        tuple: JSON response and status code.
    """
    return jsonify({"ok": False, "error": clean_cli_text(error), "data": None}), status


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


def call_core(action, *args, **kwargs):
    """Run a core function and translate any exception into an envelope.

    Core raises ValueError/TypeError/FileNotFoundError for bad input and
    RuntimeError when the Ollama CLI itself fails, so the first group maps to
    400 and the rest to 500.

    Args:
        action: Core callable to invoke.
        *args: Positional arguments for the callable.
        **kwargs: Keyword arguments for the callable.

    Returns:
        A success or failure envelope.
    """
    try:
        return ok(action(*args, **kwargs))
    except (ValueError, TypeError, FileNotFoundError) as error:
        return fail(f"{type(error).__name__}: {error}", 400)
    except Exception as error:
        return fail(describe_error(error), 500)


def body() -> dict:
    """Return the request JSON body, tolerating an empty payload.

    Returns:
        dict: Parsed body, or an empty dict when none was sent.
    """
    return request.get_json(silent=True) or {}


def read_timeout(payload: dict, default: float) -> float:
    """Read a numeric timeout from a request body.

    Args:
        payload: Request body.
        default: Value to use when the key is absent.

    Returns:
        float: The timeout in seconds.

    Raises:
        ValueError: If the supplied value is not numeric.
    """
    return float(payload.get("timeout", default))
