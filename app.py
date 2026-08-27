"""
Model Setup Hub — GUI

Flask entrypoint. Serves the dashboard and exposes a thin JSON API
that calls into the `core` submodule.

`/api/system` is wired to `core.System.scanner.scan_system()`.
`/api/ollama` is still a stub — no mock data, wire it to
`core.ollama.runtime` / `core.ollama.model` when that is ready.
"""

from datetime import datetime
import threading

from flask import Flask, jsonify, render_template, request

from core.System.scanner import scan_system

app = Flask(__name__)

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


def get_ollama_status():
    # TODO: wire to core.ollama.runtime / core.ollama.model
    return {
        "running": None,
        "version": None,
        "models": [],
    }


@app.route("/")
def dashboard():
    return render_template("dashboard.html")


@app.route("/api/system")
def api_system():
    refresh = request.args.get("refresh") in ("1", "true", "yes")
    payload = get_system_info(force_refresh=refresh)

    return jsonify(payload), 200 if payload["ok"] else 503


@app.route("/api/ollama")
def api_ollama():
    return jsonify(get_ollama_status())


if __name__ == "__main__":
    app.run(debug=True, port=5000)
