"""Background execution of multi-configuration Ollama comparisons.

``core.ollama.experiment.compare_tests`` runs every configuration against every
prompt in a single blocking call that can take minutes, so it is driven from a
worker thread and the browser polls for the outcome instead of holding a request
open.

Only one comparison is kept at a time. Two running at once would contend for the
same GPU and make every timing in both meaningless, so a second request is
refused rather than queued.
"""

from datetime import datetime
import threading
import time
import uuid

from core.ollama import experiment

_lock = threading.Lock()
_job: dict | None = None

ACTIVE_STATUS = "running"


def _snapshot(job: dict) -> dict:
    """Build the browser-facing view of a job.

    Elapsed time is derived on read rather than stored, so a running job reports
    a live duration without the worker having to tick anything.

    Args:
        job: Internal job record.

    Returns:
        dict: Job state safe to serialise.
    """
    if job["status"] == ACTIVE_STATUS:
        elapsed = time.monotonic() - job["started_monotonic"]
    else:
        elapsed = job["elapsed_seconds"]

    return {
        "id": job["id"],
        "status": job["status"],
        "model": job["model"],
        "prompts": job["prompts"],
        "configurations": job["configurations"],
        "include_output": job["include_output"],
        "planned_runs": job["planned_runs"],
        "elapsed_seconds": elapsed,
        "started_at": job["started_at"],
        "finished_at": job["finished_at"],
        "error": job["error"],
        "result": job["result"],
    }


def _work(job: dict) -> None:
    """Run one comparison to completion and record its outcome.

    Args:
        job: Internal job record to fill in.
    """
    try:
        result = experiment.compare_tests(
            model=job["model"],
            prompts=job["prompts"],
            configurations=job["configurations"],
            include_output=job["include_output"],
        )
    except Exception as error:
        outcome = {
            "status": "failed",
            "error": f"{type(error).__name__}: {error}",
            "result": None,
        }
    else:
        outcome = {
            "status": "done",
            "error": None,
            "result": result,
        }

    with _lock:
        job.update(outcome)
        job["elapsed_seconds"] = time.monotonic() - job["started_monotonic"]
        job["finished_at"] = datetime.now().strftime("%H:%M:%S")


def start(
    model: str,
    prompts: list[str],
    configurations: list[dict],
    include_output: bool = False,
) -> dict:
    """Begin a comparison in the background, replacing any finished one.

    Args:
        model: Ollama model every configuration is tested against.
        prompts: Prompt strings sent to each configuration.
        configurations: Dicts holding a ``name`` and an ``options`` dict.
        include_output: Keep the generated text in the results.

    Returns:
        dict: Snapshot of the newly started job.

    Raises:
        RuntimeError: If a comparison is already running.
    """
    global _job

    with _lock:
        if _job is not None and _job["status"] == ACTIVE_STATUS:
            raise RuntimeError(
                "A comparison is already running. Wait for it to finish before "
                "starting another."
            )

        _job = {
            "id": uuid.uuid4().hex[:12],
            "status": ACTIVE_STATUS,
            "model": model,
            "prompts": prompts,
            "configurations": configurations,
            "include_output": include_output,
            "planned_runs": len(configurations) * len(prompts),
            "started_monotonic": time.monotonic(),
            "started_at": datetime.now().strftime("%H:%M:%S"),
            "finished_at": None,
            "elapsed_seconds": 0.0,
            "error": None,
            "result": None,
        }

        job = _job

    # Daemon, so a comparison in flight never keeps the dev server alive.
    threading.Thread(
        target=_work,
        args=(job,),
        name=f"benchmark-{job['id']}",
        daemon=True,
    ).start()

    with _lock:
        return _snapshot(job)


def status() -> dict | None:
    """Return the current job snapshot.

    Returns:
        dict | None: Snapshot, or None when no comparison has been started.
    """
    with _lock:
        return _snapshot(_job) if _job is not None else None


def clear() -> bool:
    """Forget a finished job so the page can start from a clean slate.

    Returns:
        bool: Whether a job was discarded. A running job is never discarded.
    """
    global _job

    with _lock:
        if _job is None or _job["status"] == ACTIVE_STATUS:
            return False

        _job = None
        return True
