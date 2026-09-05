"""Parsers for text produced by external tools."""

from .benchmark_config import (
    ConfigError,
    normalize_configurations,
    normalize_options,
    normalize_prompts,
    normalize_repetitions,
    parse_document,
)
from .benchmark_options import OPTION_SCHEMA
from .ollama_text import parse_cli_table, parse_model_info

__all__ = [
    "OPTION_SCHEMA",
    "ConfigError",
    "normalize_configurations",
    "normalize_options",
    "normalize_prompts",
    "normalize_repetitions",
    "parse_cli_table",
    "parse_document",
    "parse_model_info",
]
