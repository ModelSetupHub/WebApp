"""Stateful helpers that outlive a single request."""

from .system_scan import get_system_info

__all__ = ["get_system_info"]
