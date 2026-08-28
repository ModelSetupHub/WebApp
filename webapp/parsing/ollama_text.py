"""Parsers turning raw Ollama CLI text into browser-renderable structures.

`core.ollama.model` returns whatever the CLI printed. Shaping that text belongs
to this layer so the submodule stays untouched.
"""

import re

from ..responses import clean_cli_text

# The CLI pads columns with runs of spaces, so two or more spaces is the
# separator and a single space stays part of a value.
COLUMN_SPLIT = re.compile(r"\s{2,}")


def parse_cli_table(text: str) -> dict:
    """Parse a padded Ollama CLI table into headers and row dicts.

    Args:
        text: Raw stdout from a command such as ``ollama list``.

    Returns:
        dict: ``{"columns": [...], "rows": [{...}], "raw": text}``. A table with
            only a header line yields an empty ``rows`` list.
    """
    lines = [line for line in clean_cli_text(text).splitlines() if line.strip()]

    if not lines:
        return {"columns": [], "rows": [], "raw": text or ""}

    columns = [col.strip().lower() for col in COLUMN_SPLIT.split(lines[0].strip())]
    rows = []

    for line in lines[1:]:
        values = [value.strip() for value in COLUMN_SPLIT.split(line.strip())]
        rows.append({
            columns[index]: values[index] if index < len(values) else ""
            for index in range(len(columns))
        })

    return {"columns": columns, "rows": rows, "raw": text or ""}


def parse_model_info(text: str) -> dict:
    """Parse ``ollama show`` output into titled sections of key/value pairs.

    The command prints section titles followed by more deeply indented entries
    that are either ``key   value`` pairs or bare flags such as capability
    names. Title indentation is not consistent between sections, so the deepest
    indent level is treated as the entries and anything shallower as a title.

    Args:
        text: Raw stdout from ``ollama show``.

    Returns:
        dict: ``{"sections": [{"title": str, "rows": [[key, value]]}], "raw": text}``
    """
    lines = [line for line in (text or "").splitlines() if line.strip()]

    if not lines:
        return {"sections": [], "raw": text or ""}

    indents = [len(line) - len(line.lstrip()) for line in lines]
    entry_indent = max(indents)

    sections: list[dict] = []
    current: dict | None = None

    for line, indent in zip(lines, indents):
        if indent < entry_indent:
            current = {"title": line.strip(), "rows": []}
            sections.append(current)
            continue

        if current is None:
            current = {"title": "Details", "rows": []}
            sections.append(current)

        parts = COLUMN_SPLIT.split(line.strip(), maxsplit=1)
        key = parts[0].strip()
        value = parts[1].strip() if len(parts) > 1 else ""
        current["rows"].append([key, value])

    return {"sections": sections, "raw": text or ""}
