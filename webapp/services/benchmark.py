"""Background execution of multi-configuration Ollama comparisons.

``MSHCore.benchmark.ollama_runner.compare_tests`` runs every configuration against
every prompt in a single blocking call that can take minutes, so it is driven from a
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

from MSHCore.cancellation import CancellationToken, OperationCancelled
from MSHCore.benchmark import ollama_runner

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
        "repetitions": job["repetitions"],
        "planned_runs": job["planned_runs"],
        "progress": job.get("progress"),
        "elapsed_seconds": elapsed,
        "started_at": job["started_at"],
        "finished_at": job["finished_at"],
        "error": job["error"],
        "result": job["result"],
    }


def _record_progress(job: dict, step: dict) -> None:
    """Turn one Core progress step into the job's browser-facing progress.

    Core reports which configuration, prompt and repetition a step belongs to
    and how many steps the whole comparison has finished; this adds the share
    those steps make of the total, which is what a progress bar draws.

    Args:
        job: The running job the comparison belongs to.
        step: One progress step as Core's callback delivered it.
    """
    steps_total = step["configuration_count"] * step["prompt_count"] * job["repetitions"]
    steps_done = step["completed"]

    with _lock:
        job["progress"] = {
            "phase": step["phase"],
            "percent": (
                round(steps_done / steps_total * 100, 1) if steps_total else 0.0
            ),
            "steps_done": steps_done,
            "steps_total": steps_total,
            "configuration": step.get("configuration"),
            "configuration_index": step["configuration_index"],
            "configuration_count": step["configuration_count"],
            "prompt_index": step["prompt_index"],
            "prompt_count": step["prompt_count"],
            "repetition": step["repetition"],
            "repetition_count": step["repetition_count"],
        }


def _work(job: dict) -> None:
    """Run one comparison to completion and record its outcome.

    Args:
        job: Internal job record to fill in.
    """
    try:
        result = ollama_runner.compare_tests(
            model=job["model"],
            prompts=job["prompts"],
            configurations=job["configurations"],
            include_output=job["include_output"],
            cancellation=job["token"],
            repetitions=job["repetitions"],
            on_progress=lambda step: _record_progress(job, step),
        )
    except OperationCancelled:
        # Core discards partial results and unloads the model it loaded, so a
        # cancelled run leaves nothing behind but its log entry.
        outcome = {
            "status": "cancelled",
            "error": None,
            "result": None,
        }
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

        if outcome["status"] == "done" and job.get("progress"):
            # The comparison completed, so the bar reads full rather than
            # stopping at whatever the last progress step happened to land on.
            job["progress"] = {
                **job["progress"],
                "percent": 100.0,
                "steps_done": job["progress"]["steps_total"],
            }


def start(
    model: str,
    prompts: list[str],
    configurations: list[dict],
    include_output: bool = False,
    repetitions: int = 1,
) -> dict:
    """Begin a comparison in the background, replacing any finished one.

    Args:
        model: Ollama model every configuration is tested against.
        prompts: Prompt strings sent to each configuration.
        configurations: Dicts holding a ``name`` and an ``options`` dict.
        include_output: Keep the generated text in the results.
        repetitions: How many times every prompt runs per configuration, from
            1. Results average the runs and report their noise.

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
            "repetitions": repetitions,
            "planned_runs": len(configurations) * len(prompts) * repetitions,
            "progress": {
                "phase": "starting",
                "percent": 0.0,
                "steps_done": 0,
                "steps_total": len(configurations) * len(prompts) * repetitions,
                "configuration": None,
                "configuration_index": 0,
                "configuration_count": len(configurations),
                "prompt_index": 0,
                "prompt_count": len(prompts),
                "repetition": 0,
                "repetition_count": repetitions,
            },
            "started_monotonic": time.monotonic(),
            "started_at": datetime.now().strftime("%H:%M:%S"),
            "finished_at": None,
            "elapsed_seconds": 0.0,
            "error": None,
            "result": None,
            "token": CancellationToken(),
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


def cancel() -> bool:
    """Request cancellation of the running comparison.

    Core stops at the next safe point — between prompts or mid-generation —
    discards partial results and unloads the model it loaded. The job then
    settles into the ``cancelled`` status the poller reports.

    Returns:
        bool: Whether a running comparison was found to cancel.
    """
    with _lock:
        if _job is None or _job["status"] != ACTIVE_STATUS:
            return False

        _job["token"].cancel("cancelled from the dashboard")
        return True


def clear() -> bool:
    """Forget a finished job so the page can start from a clean slate.

    Returns:
        bool: Whether a job was discarded. A running job is never discarded;
            cancel it first.
    """
    global _job

    with _lock:
        if _job is None or _job["status"] == ACTIVE_STATUS:
            return False

        _job = None
        return True
