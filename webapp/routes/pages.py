"""Routes serving rendered pages."""

from flask import Blueprint, render_template

blueprint = Blueprint("pages", __name__)


@blueprint.route("/")
def dashboard():
    """Render the single-page dashboard shell."""
    return render_template("dashboard.html")
