"""API routes for the System tab, backed by ``core.system.scanner``."""

from flask import Blueprint, jsonify, request

from ..services import get_system_info

blueprint = Blueprint("system", __name__, url_prefix="/api/system")


@blueprint.route("")
def api_system():
    """Return the cached hardware and software profile.

    Query params:
        refresh: ``1``/``true``/``yes`` forces a fresh scan.
    """
    refresh = request.args.get("refresh") in ("1", "true", "yes")
    payload = get_system_info(force_refresh=refresh)

    return jsonify(payload), 200 if payload["ok"] else 503