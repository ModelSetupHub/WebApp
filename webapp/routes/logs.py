"""API routes for the Logs tab, backed by ``MSHCore.logging``.

The execution log lives in ``%LOCALAPPDATA%\\MSH\\logs\\executions.log`` and
Core reads it; this blueprint wraps that store for the browser:

    GET    /api/logs            filtered entries + file info
    POST   /api/logs/reset      truncate the log file
    GET    /api/logs/open       open the log file with the OS default viewer
    GET    /api/logs/download   download the raw log file as an attachment

Filtering, capping and parsing are Core's own; this layer only carries query
parameters across and adds the two things a log viewer needs that a library
should not do by itself — opening the file in the OS viewer and resetting it.
"""

import os
import subprocess
import sys

from flask import Blueprint, Response, jsonify, request

from MSHCore.logging import get_log_file_info, read_logs

from ..responses import fail, ok

blueprint = Blueprint("logs", __name__, url_prefix="/api/logs")

# A capped read keeps a filter change instant even on a log grown huge.
DEFAULT_LIMIT = 400
MAX_LIMIT = 5000


@blueprint.route("")
def api_logs_list():
    """Return log entries matching the query, newest capped read first.

    Query params:
        level, component, action: exact-match filters, all optional.
        limit: cap on returned entries (default {DEFAULT_LIMIT}, max
            {MAX_LIMIT}).
    """
    level = (request.args.get("level") or "").strip() or None
    component = (request.args.get("component") or "").strip() or None
    action = (request.args.get("action") or "").strip() or None

    try:
        limit = int(request.args.get("limit") or DEFAULT_LIMIT)
    except ValueError:
        return fail("limit must be a whole number", 400)

    if limit < 1:
        limit = 1
    elif limit > MAX_LIMIT:
        limit = MAX_LIMIT

    try:
        entries = read_logs(
            level=level,
            component=component,
            action=action,
            line_count=limit,
        )
    except ValueError as error:
        return fail(str(error), 400)

    info = get_log_file_info()

    return ok(
        {
            "entries": entries,
            "matched": len(entries),
            "limit": limit,
            "file": {
                "path": str(info["path"]),
                "size_bytes": info["size_bytes"],
                "line_count": info["line_count"],
            },
        }
    )


@blueprint.route("/reset", methods=["POST"])
def api_logs_reset():
    """Truncate the execution log.

    Resetting is the log viewer's one destructive act: the file is the
    toolkit's own record of what ran, so the route refuses nothing — the
    button that calls it already asked the user. The file itself survives as
    an empty file, so writers never race a missing path.
    """
    info = get_log_file_info()
    path = info["path"]

    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("", encoding="utf-8")
    except OSError as error:
        return fail(f"Could not reset the log — {error}", 500)

    return ok(
        {
            "path": str(path),
            "previous_line_count": info["line_count"],
            "previous_size_bytes": info["size_bytes"],
        }
    )


def _open_with_os(path) -> None:
    """Ask the operating system to open a file with its default viewer.

    One call per platform: os.startfile on Windows, open on macOS, xdg-open
    everywhere else. Failure surfaces to the caller rather than being
    swallowed — the page tells the user the open did not happen.
    """
    if sys.platform == "win32":
        os.startfile(path)  # noqa: S606 — the user asked for this file
    elif sys.platform == "darwin":
        subprocess.run(["open", str(path)], check=True)
    else:
        subprocess.run(["xdg-open", str(path)], check=True)


@blueprint.route("/open")
def api_logs_open():
    """Open the raw log file with the operating system's default viewer."""
    info = get_log_file_info()
    path = info["path"]

    if not path.exists():
        return fail("The log file does not exist yet — run something first.", 404)

    try:
        _open_with_os(path)
    except OSError as error:
        return fail(f"Could not open the log file — {error}", 500)

    return ok({"path": str(path)})


@blueprint.route("/download")
def api_logs_download():
    """Download the raw log file as an attachment."""
    info = get_log_file_info()
    path = info["path"]

    if not path.exists():
        return fail("The log file does not exist yet — run something first.", 404)

    try:
        data = path.read_bytes()
    except OSError as error:
        return fail(f"Could not read the log file — {error}", 500)

    return Response(
        data,
        mimetype="text/plain",
        headers={
            "Content-Disposition": 'attachment; filename="executions.log"'
        },
    )
