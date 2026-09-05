"""Background execution of cross-model comparisons.

``MSHCore.benchmark.ollama_runner.compare_models`` benchmarks several models
over the same prompts and one shared configuration, unloading each model
before the next loads so their timings never share a GPU. Like the
configuration comparison, it runs on a worker thread and the browser polls.

The two comparison kinds share one GPU, so they share the busy gate too: a
model comparison and a configuration comparison refuse to run at the same
time, whichever started first. Their jobs are kept apart — a model
comparison's result is rendered by the same results page, keyed by whether
the job is cross-model — and a finished model comparison is saved into the
benchmark history like any other run.
"""

from datetime import datetime
import threading
import time
import uuid

from MSHCore.benchmark import history as benchmark_history
from MSHCore.benchmark import ollama_runner
from MSHCore.cancellation import CancellationToken, OperationCancelled
from MSHCore.logging import write_log

_lock = threading.Lock()
_job: dict | None = None

ACTIVE_STATUS = "running"


def status() -> dict | None:
    """Return the current model-comparison job, if one exists.

    Returns:
        dict | None: The job snapshot, or None when no model comparison has
        been started since the server started.
    """
    with _lock:
        return _snapshot(_job) if _job is not None else None


def _snapshot(job: dict) -> dict:
    """Build the browser-facing view of a job.

    The shape matches the configuration comparison's snapshot — same status
    names, same progress record — except the job is flagged cross-model and
    carries the model list instead of a single model, so one renderer can
    serve both.

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
        "cross_model": True,
        "models": job["models"],
        "model": None,
        "prompts": job["prompts"],
        "configurations": job["configurations"],
        "include_output": job["include_output"],
        "repetitions": job["repetitions"],
        "planned_runs": job["planned_runs"],
        "progress": job.get("progress"),
        "history_id": job.get("history_id"),
        "elapsed_seconds": elapsed,
        "started_at": job["started_at"],
        "finished_at": job["finished_at"],
        "error": job["error"],
        "result": job["result"],
    }


def _record_progress(job: dict, step: dict) -> None:
    """Turn one Core progress step into the job's browser-facing progress.

    Args:
        job: The running job the comparison belongs to.
        step: One progress step as Core's callback delivered it.
    """
    steps_total = step["model_count"] * step["prompt_count"] * job["repetitions"]
    steps_done = step["completed"]

    with _lock:
        job["progress"] = {
            "phase": step["phase"],
            "percent": (
                round(steps_done / steps_total * 100, 1) if steps_total else 0.0
            ),
            "steps_done": steps_done,
            "steps_total": steps_total,
            "configuration": step.get("model"),
            "configuration_index": step["model_index"],
            "configuration_count": step["model_count"],
            "prompt_index": step["prompt_index"],
            "prompt_count": step["prompt_count"],
            "repetition": step["repetition"],
            "repetition_count": step["repetition_count"],
        }


def _work(job: dict) -> None:
    """Run one model comparison to completion and record its outcome.

    Args:
        job: Internal job record to fill in.
    """
    try:
        result = ollama_runner.compare_models(
            models=job["models"],
            prompts=job["prompts"],
            config=job["config"],
            include_output=job["include_output"],
            cancellation=job["token"],
            repetitions=job["repetitions"],
            on_progress=lambda step: _record_progress(job, step),
        )
    except OperationCancelled:
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
            job["progress"] = {
                **job["progress"],
                "percent": 100.0,
                "steps_done": job["progress"]["steps_total"],
            }

    if outcome["status"] == "done":
        saved_id = None

        try:
            saved_id = benchmark_history.save(outcome["result"])
        except Exception as error:
            write_log(
                level="WARNING",
                component="webapp/benchmark",
                action="history_save",
                message="Saving the finished model comparison to history failed",
                details={"error": str(error)},
            )

        with _lock:
            job["history_id"] = saved_id


def job_is_running() -> bool:
    """Report whether a model comparison is holding the GPU right now.

    The configuration-comparison service asks the same question before
    starting its own run: two comparisons at once would contend for the GPU
    and make every timing in both meaningless, whichever kind they are.

    Returns:
        bool: True while a model comparison is in flight.
    """
    with _lock:
        return _job is not None and _job["status"] == ACTIVE_STATUS


def start(
    models: list[str],
    prompts: list[str],
    config: dict | None = None,
    include_output: bool = False,
    repetitions: int = 1,
) -> dict:
    """Begin a model comparison in the background, replacing any finished one.

    Args:
        models: Model names to compare, in run order.
        prompts: Prompt strings every model answers.
        config: Generation parameters shared by every model.
        include_output: Keep the generated text in the results.
        repetitions: How many times every prompt runs per model, from 1.

    Returns:
        dict: Snapshot of the newly started job.

    Raises:
        RuntimeError: If a comparison of either kind is already running.
    """
    global _job

    with _lock:
        if _job is not None and _job["status"] == ACTIVE_STATUS:
            raise RuntimeError(
                "A comparison is already running. Wait for it to finish before "
                "starting another."
            )

        # The GPU is shared with the configuration-comparison service, which
        # asks the same question of this module. Imported here so the two
        # services can check each other's state without an import cycle.
        from . import benchmark

        if benchmark.job_is_running():
            raise RuntimeError(
                "A comparison is already running. Wait for it to finish before "
                "starting another."
            )

        _job = {
            "id": uuid.uuid4().hex[:12],
            "status": ACTIVE_STATUS,
            "models": models,
            "prompts": prompts,
            "config": dict(config or {}),
            "configurations": [
                {"name": model, "options": dict(config or {})}
                for model in models
            ],
            "include_output": include_output,
            "repetitions": repetitions,
            "planned_runs": len(models) * len(prompts) * repetitions,
            "progress": {
                "phase": "starting",
                "percent": 0.0,
                "steps_done": 0,
                "steps_total": len(models) * len(prompts) * repetitions,
                "configuration": None,
                "configuration_index": 0,
                "configuration_count": len(models),
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

    threading.Thread(
        target=_work,
        args=(job,),
        name=f"models-{job['id']}",
        daemon=True,
    ).start()

    with _lock:
        return _snapshot(job)


def cancel() -> bool:
    """Request cancellation of the running model comparison.

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
