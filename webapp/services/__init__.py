"""Stateful helpers that outlive a single request."""

from . import benchmark
from .system_scan import get_system_info

__all__ = ["benchmark", "get_system_info"]
