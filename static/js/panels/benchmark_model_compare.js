// Cross-model comparison drawer: the same prompts and one shared
// configuration measured against two to six installed models, one after
// another. The drawer is deliberately self-contained — its own prompts,
// repetitions, config and results — so the main benchmark flow (one model,
// several configurations) is untouched by it.
//
// The server answers:
//   POST   /api/models-compare/run      start compare_models in the background
//   GET    /api/models-compare/status   poll the running or finished job
//   POST   /api/models-compare/cancel   stop a running comparison
//   POST   /api/models-compare/clear    discard a finished one
//
// Results render through the same renderer the configuration comparison uses:
// Core answers with the identical result shape, the model's name standing in
// for the configuration's.

import { api, postJson } from "../lib/api.js";
import { escapeHtml, hideAlert, showAlert } from "../lib/format.js";
import { t, tn } from "../lib/i18n.js";
import { getInstalledModels } from "../lib/state.js";
import { setButtonBusy, toast } from "../lib/toast.js";
import { renderResults } from "./benchmark_results.js";

const POLL_INTERVAL_MS = 1500;
const MIN_MODELS = 2;
const MAX_MODELS = 6;

const toggleBtn = document.getElementById("btn-models-toggle");
const drawerEl = document.getElementById("bench-models-drawer");
const closeBtn = document.getElementById("btn-models-close");
const listEl = document.getElementById("bench-models-list");
const promptsEl = document.getElementById("bench-mc-prompts");
const repetitionsEl = document.getElementById("bench-mc-repetitions");
const configEl = document.getElementById("bench-models-config");
const statusEl = document.getElementById("bench-models-status");
const runBtn = document.getElementById("btn-models-run");
const progressEl = document.getElementById("bench-models-progress");
const resultsEl = document.getElementById("bench-mc-results");
const errorEl = document.getElementById("bench-mc-error");

let pollTimer = null;
let isRunning = false;

// The installed models the user ticked, in click order. Order matters: the
// models run one after another and the list preserves the user's sequence.
const selected = new Set();

/** Read the drawer's prompts textarea into a list, blank-line separated. */
function readPrompts() {
  return promptsEl.value
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/** Read the shared-config JSON, or null when it does not parse. */
function readConfig() {
  const text = configEl.value.trim();

  if (!text) {
    return {};
  }

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/** Repaint the model checklist from the installed list and the ticks. */
function renderModelList() {
  const installed = getInstalledModels();

  if (installed.length === 0) {
    listEl.innerHTML = `<span class="bench-history-empty-note">${escapeHtml(
      t("bench.modelsNoneInstalled")
    )}</span>`;
    return;
  }

  listEl.innerHTML = installed
    .map(
      (model) => `
        <label class="bench-models-item">
          <input type="checkbox" value="${escapeHtml(model)}"
                 ${selected.has(model) ? "checked" : ""}>
          <span dir="ltr">${escapeHtml(model)}</span>
        </label>`
    )
    .join("");

  listEl.querySelectorAll("input[type=checkbox]").forEach((box) => {
    box.addEventListener("change", () => {
      if (box.checked) {
        selected.add(box.value);
      } else {
        selected.delete(box.value);
      }
      updateRunState();
    });
  });
}

/** Paint the cards-like status line under the drawer's controls. */
function updateRunState() {
  if (isRunning) {
    statusEl.className = "bench-models-status is-bad";
    statusEl.textContent = t("bench.inProgress");
    runBtn.disabled = true;
    return;
  }

  const prompts = readPrompts();
  const blockers = [];

  if (selected.size < MIN_MODELS) {
    blockers.push(t("bench.modelsMissing"));
  }

  if (prompts.length === 0) {
    blockers.push(t("bench.missingPrompts"));
  }

  if (readConfig() === null) {
    blockers.push(t("bench.modelsConfigInvalid"));
  }

  if (blockers.length > 0) {
    statusEl.className = "bench-models-status is-bad";
    statusEl.textContent = t("bench.stillMissing", {
      items: blockers.join(t("bench.listSeparator")),
    });
    runBtn.disabled = true;
    return;
  }

  const runs = selected.size * prompts.length * readRepetitions();

  statusEl.className = "bench-models-status is-good";
  statusEl.textContent = t("bench.modelsReady", {
    n: runs,
    count: selected.size,
  });
  runBtn.disabled = false;
}

/** Read the drawer's repetitions input, clamped to the server's range. */
function readRepetitions() {
  const value = Number.parseInt(repetitionsEl.value, 10);
  return Number.isInteger(value) && value >= 1 ? Math.min(value, 10) : 1;
}

/**
 * Show or hide the model comparison's progress bar. Same markup and progress
 * record as the configuration comparison's bar — Core reports the same step
 * shape, with the model standing in for the configuration.
 *
 * @param {object|null} job Job snapshot, or null to hide the bar.
 */
function renderProgress(job) {
  if (!job || job.status !== "running") {
    progressEl.classList.add("is-hidden");
    progressEl.innerHTML = "";
    return;
  }

  const progress = job.progress || null;
  const percent = progress ? progress.percent : null;

  let stepLine = "";

  if (progress && progress.phase !== "starting") {
    stepLine = `<div class="bench-progress-detail">${escapeHtml(
      t("bench.progressStep", {
        name: progress.configuration,
        i: progress.configuration_index,
        n: progress.configuration_count,
        p: progress.prompt_index,
        pn: progress.prompt_count,
        r: progress.repetition || 1,
        rn: progress.repetition_count,
      })
    )}</div>`;
  } else if (progress) {
    stepLine = `<div class="bench-progress-detail">${escapeHtml(
      t("bench.modelsProgressStarting")
    )}</div>`;
  }

  const bar =
    percent === null
      ? ""
      : `<div class="bench-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
          <span class="bench-progress-track">
            <span class="bench-progress-fill" style="width:${percent}%"></span>
          </span>
          <span class="bench-progress-percent" dir="ltr">${percent}%</span>
        </div>`;

  progressEl.classList.remove("is-hidden");
  progressEl.innerHTML = `
    <div class="bench-progress-top">
      <span class="spinner"></span>
      <span class="bench-progress-text">${escapeHtml(
        t("bench.modelsProgressText", {
          runs: job.planned_runs,
          models: job.models.length,
        })
      )}</span>
      <span class="bench-progress-meta">${escapeHtml(
        t("bench.progressMeta", {
          time: job.started_at,
          seconds: Math.round(job.elapsed_seconds),
        })
      )}</span>
      <button type="button" class="btn btn-sm" id="btn-mc-cancel">${escapeHtml(
        t("bench.cancelRun")
      )}</button>
    </div>
    ${bar}
    ${stepLine}`;

  document.getElementById("btn-mc-cancel").addEventListener("click", async () => {
    const cancelBtn = document.getElementById("btn-mc-cancel");
    const restore = setButtonBusy(cancelBtn);

    try {
      await postJson("/api/models-compare/cancel", {});
      toast("pending", t("bench.cancelRun"), t("bench.cancelledBody"));
    } catch (error) {
      toast("error", t("bench.cannotCancel"), error.message);
    } finally {
      restore();
    }
  });
}

/**
 * Lock or unlock the drawer's controls while a comparison runs.
 *
 * @param {boolean} running Whether a model comparison is in flight.
 */
function setRunning(running) {
  isRunning = running;

  [promptsEl, configEl, runBtn].forEach((el) => {
    el.disabled = running;
  });

  listEl
    .querySelectorAll("input[type=checkbox]")
    .forEach((box) => (box.disabled = running));

  updateRunState();
}

/**
 * Apply a job snapshot to the drawer.
 *
 * @param {object|null} job Snapshot from the run or status endpoint.
 */
function applyJob(job) {
  if (!job) {
    setRunning(false);
    renderProgress(null);
    return;
  }

  if (job.status === "running") {
    setRunning(true);
    renderProgress(job);
    return;
  }

  setRunning(false);
  renderProgress(null);

  if (job.status === "failed") {
    showAlert(errorEl, t("bench.comparisonFailed", { error: job.error }));
    return;
  }

  if (job.status === "cancelled") {
    hideAlert(errorEl);
    resultsEl.innerHTML = `<div class="empty-state">${escapeHtml(
      t("bench.cancelledBody")
    )}</div>`;
    return;
  }

  hideAlert(errorEl);
  const { discardButton } = renderResults(resultsEl, job, {
    discardEndpoint: "/api/models-compare/clear",
  });

  if (discardButton) {
    discardButton.addEventListener("click", async () => {
      try {
        await postJson("/api/models-compare/clear", {});
      } catch (error) {
        toast("error", t("bench.cannotDiscard"), error.message);
        return;
      }

      resultsEl.innerHTML = `<div class="empty-state">${escapeHtml(
        t("bench.noRunYet")
      )}</div>`;
    });
  }
}

/** Poll the model-comparison status endpoint until the run settles. */
function startPolling() {
  window.clearInterval(pollTimer);

  pollTimer = window.setInterval(async () => {
    let job;

    try {
      job = (await api("/api/models-compare/status")).data;
    } catch (error) {
      return;
    }

    applyJob(job);

    if (!job || job.status !== "running") {
      window.clearInterval(pollTimer);
      pollTimer = null;

      if (job && job.status === "done") {
        toast(
          "success",
          t("bench.modelsFinished"),
          t("bench.finishedBody", { n: job.result.tests.length })
        );
      } else if (job && job.status === "failed") {
        toast("error", t("bench.failed"), job.error);
      } else if (job && job.status === "cancelled") {
        toast("info", t("bench.cancelled"), t("bench.cancelledBody"));
      }
    }
  }, POLL_INTERVAL_MS);
}

/** Send the drawer's setup to the server and start following the job. */
async function run() {
  const prompts = readPrompts();
  const config = readConfig();
  const restore = setButtonBusy(runBtn);

  try {
    const { data } = await postJson("/api/models-compare/run", {
      models: [...selected],
      prompts,
      config,
      repetitions: readRepetitions(),
    });

    hideAlert(errorEl);
    resultsEl.innerHTML = `<div class="empty-state">${escapeHtml(
      t("bench.runningPlaceholder")
    )}</div>`;
    applyJob(data);
    startPolling();

    toast(
      "pending",
      t("bench.started"),
      t("bench.startedBody", { n: data.planned_runs })
    ).dismiss();
  } catch (error) {
    showAlert(errorEl, t("bench.cannotStartAlert", { error: error.message }));
    toast("error", t("bench.cannotStart"), error.message);
  } finally {
    restore();
    updateRunState();
  }
}

function bind() {
  toggleBtn.addEventListener("click", () => {
    const opening = drawerEl.classList.contains("is-hidden");

    drawerEl.classList.toggle("is-hidden", !opening);

    if (opening) {
      renderModelList();
      updateRunState();
    }
  });

  closeBtn.addEventListener("click", () => {
    drawerEl.classList.add("is-hidden");
  });

  runBtn.addEventListener("click", run);

  promptsEl.addEventListener("input", updateRunState);
  configEl.addEventListener("input", updateRunState);
}

/**
 * Bind the cross-model drawer and pick up a comparison already in flight, so
 * a reload during a run does not lose it.
 */
export function initModelComparePanel() {
  bind();

  // The model checklist fills when the Models panel has loaded its list, so
  // try once now and again the next time the drawer opens.
  renderModelList();

  window.addEventListener("models-loaded", () => renderModelList());

  (async () => {
    try {
      const { data } = await api("/api/models-compare/status");
      applyJob(data);

      if (data && data.status === "running") {
        startPolling();
      }
    } catch {
      // The drawer explains itself when a later action fails; a status read
      // that cannot happen yet says nothing worth an alert.
    }
  })();
}
