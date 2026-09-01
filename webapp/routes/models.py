"""API routes for the Models tab, backed by ``MSHCore.ollama.model``.

Maps every model function core exposes:

    GET  /api/ollama/models             list_models
    GET  /api/ollama/models/running     list_running_models
    GET  /api/ollama/models/info        show_model_info
    POST /api/ollama/models/add         add_model
    POST /api/ollama/models/remove      remove_model
    POST /api/ollama/models/run         run_model
    POST /api/ollama/models/stop        stop_model
    POST /api/ollama/models/load        load_model
    POST /api/ollama/models/configure   configure_model
"""

from flask import Blueprint, request

from MSHCore.ollama import model as ollama_model

from ..parsing import parse_cli_table, parse_model_info
from ..responses import body, call_core, describe_error, fail, ok

blueprint = Blueprint("models", __name__, url_prefix="/api/ollama/models")

DEFAULT_KEEP_ALIVE = "10m"


@blueprint.route("")
def api_models_list():
    """Return the installed models as a table."""
    try:
        return ok(parse_cli_table(ollama_model.list_models()))
    except Exception as error:
        return fail(describe_error(error))


@blueprint.route("/running")
def api_models_running():
    """Return the models currently resident in memory as a table."""
    try:
        return ok(parse_cli_table(ollama_model.list_running_models()))
    except Exception as error:
        return fail(describe_error(error))


@blueprint.route("/info")
def api_model_info():
    """Return metadata sections for one installed model."""
    name = (request.args.get("model") or "").strip()

    if not name:
        return fail("A model name is required", 400)

    try:
        return ok(parse_model_info(ollama_model.show_model_info(name)))
    except RuntimeError as error:
        return fail(str(error), 502)
    except Exception as error:
        return fail(describe_error(error))


@blueprint.route("/add", methods=["POST"])
def api_model_add():
    """Register a local model file with Ollama."""
    payload = body()
    name = (payload.get("model_name") or "").strip()
    path = (payload.get("model_path") or "").strip()

    if not name or not path:
        return fail("Both a model name and a model file path are required", 400)

    return call_core(ollama_model.add_model, name, path)


@blueprint.route("/remove", methods=["POST"])
def api_model_remove():
    """Delete a model from local Ollama storage."""
    name = (body().get("model") or "").strip()

    if not name:
        return fail("A model name is required", 400)

    return call_core(ollama_model.remove_model, name)


@blueprint.route("/run", methods=["POST"])
def api_model_run():
    """Run one prompt against a model and return its output."""
    payload = body()
    name = (payload.get("model") or "").strip()
    prompt = payload.get("prompt") or ""

    if not name:
        return fail("A model name is required", 400)

    if not prompt.strip():
        return fail("A prompt is required", 400)

    return call_core(ollama_model.run_model, name, prompt)


@blueprint.route("/stop", methods=["POST"])
def api_model_stop():
    """Unload a running model from memory."""
    name = (body().get("model") or "").strip()

    if not name:
        return fail("A model name is required", 400)

    return call_core(ollama_model.stop_model, name)


@blueprint.route("/load", methods=["POST"])
def api_model_load():
    """Load a model into memory and keep it resident."""
    payload = body()
    name = (payload.get("model") or "").strip()
    keep_alive = (payload.get("keep_alive") or DEFAULT_KEEP_ALIVE).strip()

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


@blueprint.route("/configure", methods=["POST"])
def api_model_configure():
    """Create a new model from an existing one with different parameters."""
    payload = body()
    source = (payload.get("source_model") or "").strip()
    target = (payload.get("target_model") or "").strip()
    parameters = payload.get("parameters")

    if not source or not target:
        return fail("Both a source and a target model name are required", 400)

    if not isinstance(parameters, dict) or not parameters:
        return fail("At least one configuration parameter is required", 400)

    return call_core(ollama_model.configure_model, source, target, parameters)
