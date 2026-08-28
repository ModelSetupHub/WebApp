"""API routes for the Benchmark tab, backed by ``core.ollama.experiment``.

``compare_tests`` is the only core function this tab drives. It blocks for as
long as every configuration takes to answer every prompt, so it runs in a
background job and the browser polls:

    GET  /api/benchmark/schema     option table the manual form is built from
    POST /api/benchmark/parse      validate a pasted or uploaded config file
    POST /api/benchmark/run        start compare_tests in the background
    GET  /api/benchmark/status     poll the running or finished job
    POST /api/benchmark/clear      discard a finished job
    POST /api/benchmark/export     download a run as a reusable config file
"""

from flask import Blueprint, jsonify, request

from ..parsing import (
    OPTION_SCHEMA,
    ConfigError,
    normalize_configurations,
    normalize_prompts,
    parse_document,
)
from ..responses import body, fail, ok
from ..services import benchmark

blueprint = Blueprint("benchmark", __name__, url_prefix="/api/benchmark")

# A configuration file is a short document; anything larger is a mistake and
# should not be read into memory or parsed.
MAX_UPLOAD_BYTES = 256 * 1024


@blueprint.route("/schema")
def api_benchmark_schema():
    """Return the option table the manual configuration form is built from."""
    return ok({"options": OPTION_SCHEMA})


@blueprint.route("/parse", methods=["POST"])
def api_benchmark_parse():
    """Validate configuration file contents without starting a run.

    Accepts either a multipart upload under ``file`` or a JSON body with a
    ``text`` key, so the same endpoint serves the file picker and a paste box.
    """
    upload = request.files.get("file")

    if upload is not None:
        raw = upload.read(MAX_UPLOAD_BYTES + 1)

        if len(raw) > MAX_UPLOAD_BYTES:
            return fail("The configuration file is too large (limit 256 KB)", 400)

        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            return fail("The configuration file must be UTF-8 text", 400)

        source = upload.filename or "configuration.json"
    else:
        text = body().get("text") or ""
        source = "pasted text"

    try:
        document = parse_document(text)
    except ConfigError as error:
        return fail(str(error), 400)

    if not document["configurations"]:
        return fail(
            "The file holds no configurations. Include a 'configurations' list, "
            "or an object of Ollama options.",
            400,
        )

    return ok({**document, "source": source})


@blueprint.route("/run", methods=["POST"])
def api_benchmark_run():
    """Start a comparison across every supplied configuration."""
    payload = body()
    model = (payload.get("model") or "").strip()

    if not model:
        return fail("A model name is required", 400)

    try:
        prompts = normalize_prompts(payload.get("prompts"))
        configurations = normalize_configurations(payload.get("configurations"))
    except ConfigError as error:
        return fail(str(error), 400)

    try:
        job = benchmark.start(
            model=model,
            prompts=prompts,
            configurations=configurations,
            include_output=bool(payload.get("include_output")),
        )
    except RuntimeError as error:
        # 409: the request is well-formed, the server is just already busy.
        return fail(str(error), 409)

    return ok(job)


@blueprint.route("/status")
def api_benchmark_status():
    """Return the current comparison job, or null when none has run."""
    return ok(benchmark.status())


@blueprint.route("/clear", methods=["POST"])
def api_benchmark_clear():
    """Discard a finished comparison so the page starts clean."""
    # Nothing to discard is the state the caller asked for, not a failure.
    if benchmark.status() is None:
        return ok(None)

    if not benchmark.clear():
        return fail("A comparison is still running", 409)

    return ok(None)


@blueprint.route("/export", methods=["POST"])
def api_benchmark_export():
    """Return the current setup as a configuration file the page can re-upload."""
    payload = body()
    model = (payload.get("model") or "").strip()

    try:
        configurations = normalize_configurations(payload.get("configurations"))
        prompts = normalize_prompts(payload.get("prompts")) if payload.get("prompts") else []
    except ConfigError as error:
        return fail(str(error), 400)

    document = {
        "model": model or None,
        "prompts": prompts,
        "include_output": bool(payload.get("include_output")),
        "configurations": configurations,
    }

    response = jsonify(document)
    response.headers["Content-Disposition"] = (
        'attachment; filename="benchmark-configurations.json"'
    )

    return response
