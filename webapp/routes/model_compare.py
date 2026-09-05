"""API routes for cross-model comparisons, backed by the model-compare service.

    POST   /api/models-compare/run      start compare_models in the background
    GET    /api/models-compare/status   poll the running or finished job
    POST   /api/models-compare/cancel   ask the running comparison to stop
    POST   /api/models-compare/clear    discard a finished job
"""

from flask import Blueprint

from MSHCore.benchmark import ollama_runner

from ..parsing import (
    ConfigError,
    normalize_options,
    normalize_prompts,
    normalize_repetitions,
)
from ..responses import body, fail, ok
from ..services import model_compare

blueprint = Blueprint("model_compare", __name__, url_prefix="/api/models-compare")

# A cross-model run loads every model in turn; a long list is a long run and
# most machines fit a handful of models anyway.
MAX_MODELS = 6


@blueprint.route("/run", methods=["POST"])
def api_models_compare_run():
    """Start a comparison of several models over one shared configuration."""
    payload = body()

    raw_models = payload.get("models")

    if not isinstance(raw_models, list):
        return fail("A list of models is required", 400)

    models = []

    for position, model in enumerate(raw_models, start=1):
        if not isinstance(model, str) or not model.strip():
            return fail(f"Model {position} must be a non-empty string", 400)

        models.append(model.strip())

    if len(models) < 2:
        return fail("Pick at least two models to compare", 400)

    if len(models) > MAX_MODELS:
        return fail(f"At most {MAX_MODELS} models can be compared in one run", 400)

    try:
        prompts = normalize_prompts(payload.get("prompts"))
        options = normalize_options(payload.get("config") or {})
        repetitions = normalize_repetitions(payload.get("repetitions"))
    except ConfigError as error:
        return fail(str(error), 400)

    # Per-model overrides: the tournament mode sends one configuration per
    # model, so each model races under its own settings.
    raw_model_configs = payload.get("model_configs") or {}

    if not isinstance(raw_model_configs, dict):
        return fail("model_configs must be an object keyed by model name", 400)

    model_configs = {}

    try:
        for name, entry in raw_model_configs.items():
            if name not in models:
                return fail(
                    f"model_configs names '{name}', which is not among the "
                    f"models being compared",
                    400,
                )

            model_configs[name] = normalize_options(entry or {})
    except ConfigError as error:
        return fail(str(error), 400)

    try:
        job = model_compare.start(
            models=models,
            prompts=prompts,
            config=options,
            model_configs=model_configs,
            include_output=bool(payload.get("include_output")),
            repetitions=repetitions,
        )
    except RuntimeError as error:
        # 409: the request is well-formed, the server is just already busy.
        return fail(str(error), 409)

    return ok(job)


@blueprint.route("/status")
def api_models_compare_status():
    """Return the current model-comparison job, or null when none has run."""
    return ok(model_compare.status())


@blueprint.route("/cancel", methods=["POST"])
def api_models_compare_cancel():
    """Ask the running model comparison to stop."""
    if not model_compare.cancel():
        return fail("No model comparison is running", 409)

    return ok(None)


@blueprint.route("/clear", methods=["POST"])
def api_models_compare_clear():
    """Discard a finished model comparison."""
    if model_compare.status() is None:
        return ok(None)

    if not model_compare.clear():
        return fail("A model comparison is still running", 409)

    return ok(None)
