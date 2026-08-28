"""Cached access to the core system scanner.

A full scan shells out to PowerShell and nvidia-smi and costs several seconds,
so the profile is held in memory and only recomputed when a caller asks for a
fresh one.
"""

from datetime import datetime
import threading

from core.System.scanner import scan_system

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
