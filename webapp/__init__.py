"""Flask application package for the Model Setup Hub GUI.

The app is a thin JSON layer over the `core` submodule plus the dashboard it
serves. Responsibilities are split as:

    responses.py        transport envelope and core-exception translation
    parsing.py          Ollama CLI text into browser-renderable structures
    services/           stateful work that outlives a single request
    routes/             one blueprint per feature area

Templates and static files stay at the project root so the package holds only
Python.
"""

from pathlib import Path

from flask import Flask

BASE_DIR = Path(__file__).resolve().parent.parent


def create_app() -> Flask:
    """Build the Flask app and register every blueprint.

    Returns:
        Flask: Configured application instance.
    """
    app = Flask(
        __name__,
        template_folder=str(BASE_DIR / "templates"),
        static_folder=str(BASE_DIR / "static"),
    )

    from .routes.benchmark import blueprint as benchmark_blueprint
    from .routes.models import blueprint as models_blueprint
    from .routes.pages import blueprint as pages_blueprint
    from .routes.runtime import blueprint as runtime_blueprint
    from .routes.system import blueprint as system_blueprint

    app.register_blueprint(pages_blueprint)
    app.register_blueprint(system_blueprint)
    app.register_blueprint(runtime_blueprint)
    app.register_blueprint(models_blueprint)
    app.register_blueprint(benchmark_blueprint)

    return app
