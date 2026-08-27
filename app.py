"""
Model Setup Hub — GUI

Flask entrypoint. Serves the dashboard and exposes a thin JSON API
that will call into the `core` submodule.

These endpoints currently return empty/unknown values — no mock data.
Replace each function body with a real call into `core.system` /
`core.ollama` once that wiring is ready.
"""

from flask import Flask, jsonify, render_template

app = Flask(__name__)


def get_system_info():
    # TODO: wire to core.system.hardware
    return {
        "cpu": None,
        "cpu_load": None,
        "ram_total_gb": None,
        "ram_used_gb": None,
        "gpu": None,
        "vram_total_gb": None,
        "vram_used_gb": None,
    }


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
    return jsonify(get_system_info())


@app.route("/api/ollama")
def api_ollama():
    return jsonify(get_ollama_status())


if __name__ == "__main__":
    app.run(debug=True, port=5000)