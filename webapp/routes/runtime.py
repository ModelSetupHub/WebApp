"""API routes for the Ollama tab, backed by ``MSHCore.ollama.runtime``.

Covers get_status, install, start and stop. Each mutating route answers with the
resulting status so the browser renders observed state rather than an assumed
outcome.
"""

from flask import Blueprint

from MSHCore.ollama import runtime as ollama_runtime

from ..responses import body, describe_error, fail, ok, read_timeout

blueprint = Blueprint("runtime", __name__, url_prefix="/api/ollama")


@blueprint.route("/status")
def api_ollama_status():
    """Return whether Ollama is installed, running, and at which version."""
    try:
        return ok(ollama_runtime.get_status())
    except Exception as error:
        return fail(describe_error(error))


@blueprint.route("/start", methods=["POST"])
def api_ollama_start():
    """Start the Ollama server and wait for its API to answer."""
    try:
        timeout = read_timeout(body(), ollama_runtime.START_TIMEOUT)
    except (TypeError, ValueError):
        return fail("Timeout must be a number", 400)

    try:
        ollama_runtime.start(timeout)
    except RuntimeError as error:
        return fail(str(error), 502)
    except Exception as error:
        return fail(describe_error(error))

    return ok(ollama_runtime.get_status())


@blueprint.route("/stop", methods=["POST"])
def api_ollama_stop():
    """Terminate the Ollama server and wait for its API to go quiet."""
    try:
        timeout = read_timeout(body(), ollama_runtime.STOP_TIMEOUT)
    except (TypeError, ValueError):
        return fail("Timeout must be a number", 400)

    try:
        ollama_runtime.stop(timeout)
    except RuntimeError as error:
        return fail(str(error), 502)
    except Exception as error:
        return fail(describe_error(error))

    status = ollama_runtime.get_status()

    # core stops the server process, but the Ollama desktop/tray app supervises
    # it and starts a fresh one immediately. Report that instead of claiming a
    # stop that did not stick.
    return ok(status, restarted=status["running"])


@blueprint.route("/install", methods=["POST"])
def api_ollama_install():
    """Run an Ollama installer already present on this machine."""
    installer = (body().get("installer_path") or "").strip()

    if not installer:
        return fail("A path to the Ollama installer is required", 400)

    try:
        ollama_runtime.install(installer)
    except FileNotFoundError as error:
        return fail(str(error), 400)
    except Exception as error:
        return fail(describe_error(error))

    return ok(ollama_runtime.get_status())
