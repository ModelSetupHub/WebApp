"""Parsers for text produced by external tools."""

from .ollama_text import parse_cli_table, parse_model_info

__all__ = ["parse_cli_table", "parse_model_info"]
