"""API routes for the benchmark history, backed by ``MSHCore.benchmark.history``.

Finished comparisons are saved into the toolkit's history automatically (see
the benchmark service); this blueprint only serves the store back out:

    GET    /api/history            the index, newest first
    GET    /api/history/<id>       one run in full
    DELETE /api/history/<id>       remove one run
"""

from flask import Blueprint

from MSHCore.benchmark import history as benchmark_history

from ..responses import fail, ok

blueprint = Blueprint("history", __name__, url_prefix="/api/history")


@blueprint.route("")
def api_history_list():
    """List the saved benchmark runs, newest first."""
    return ok(benchmark_history.list_saved())


@blueprint.route("/<benchmark_id>")
def api_history_get(benchmark_id: str):
    """Return one saved run in full, header and result alike."""
    try:
        return ok(benchmark_history.load(benchmark_id))
    except ValueError as error:
        return fail(str(error), 400)
    except benchmark_history.BenchmarkNotFoundError as error:
        return fail(str(error), 404)


@blueprint.route("/<benchmark_id>", methods=["DELETE"])
def api_history_delete(benchmark_id: str):
    """Remove one saved run from the history."""
    try:
        deleted = benchmark_history.delete(benchmark_id)
    except ValueError as error:
        return fail(str(error), 400)

    return ok({"deleted": deleted})
