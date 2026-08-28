"""Model Setup Hub — GUI entrypoint.

Run with ``python app.py``. Application wiring lives in the ``webapp`` package;
this file only builds and starts it.
"""

from webapp import create_app

app = create_app()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
