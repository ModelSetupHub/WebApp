// Benchmark tab controller: assemble a set of configurations, run compare_tests
// in the background, and poll until it settles.
//
// The run is a background job on the server, so the browser's job is to keep the
// builder and the poller in agreement about what is happening: while a job is
// running every control that would change the setup is disabled, because the run
// already has its own copy of it.

import { api, postJson } from "../lib/api.js";
import { escapeHtml, hideAlert, showAlert } from "../lib/format.js";
import { t, tn } from "../lib/i18n.js";
import { getInstalledModels, getOllamaStatus } from "../lib/state.js";
import { setButtonBusy, toast } from "../lib/toast.js";
import {
  addConfigurations,
  clearConfigurations,
  duplicateConfiguration,
  getConfiguration,
  getConfigurations,
  removeConfiguration,
  toPayload,
  updateConfiguration,
  addConfiguration,
} from "./benchmark_store.js";
import {
  buildEditor,
  fillEditor,
  focusEditor,
  readEditor,
  resetEditor,
} from "./benchmark_editor.js";
import { renderConfigList } from "./benchmark_render.js";
import { renderResults } from "./benchmark_results.js";

// A single prompt can take a minute on a large model, so polling is deliberately
// slow; the elapsed clock is interpolated between polls instead.
const POLL_INTERVAL_MS = 1500;

const errorEl = document.getElementById("bench-error");
const metaEl = document.getElementById("bench-meta");
const cardsEl = document.getElementById("bench-cards");

const modelEl = document.getElementById("bench-model");
const promptsEl = document.getElementById("bench-prompts");
const includeOutputEl = document.getElementById("bench-include-output");

const configListEl = document.getElementById("bench-config-list");
const configCountEl = document.getElementById("bench-config-count");
const addBtn = document.getElementById("btn-config-add");
const importBtn = document.getElementById("btn-config-import");
const clearBtn = document.getElementById("btn-config-clear");

const editorEl = document.getElementById("bench-editor");
const editorTitleEl = document.getElementById("bench-editor-title");
const editorSaveBtn = document.getElementById("btn-editor-save");

const importEl = document.getElementById("bench-import");
const dropzoneEl = document.getElementById("bench-dropzone");
const fileEl = document.getElementById("bench-file");
const pasteEl = document.getElementById("bench-paste-text");
const previewEl = document.getElementById("bench-import-preview");

const runBtn = document.getElementById("btn-bench-run");
const runStateEl = document.getElementById("bench-run-state");
const runNoteEl = document.getElementById("bench-run-note");
const progressEl = document.getElementById("bench-progress");
const resultsEl = document.getElementById("bench-results");
const exportBtn = document.getElementById("btn-bench-export");

// Id of the configuration being edited, or null when the editor is adding a new
// one. Options the schema has no field for are held here across a save.
let editingId = null;
let editingExtras = {};

// The last parsed-but-not-yet-applied import.
let pendingImport = null;

let pollTimer = null;
let isRunning = false;

/**
 * Read the prompt textarea into a list.
 *
 * Prompts are separated by a blank line so a single prompt can still span
 * several lines, which is what a realistic test prompt usually does.
 *
 * @returns {string[]} Non-empty prompts.
 */
function readPrompts() {
  return promptsEl.value
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/** Paint the four summary cards at the top of the tab. */
function renderCards() {
  const configurations = getConfigurations();
  const prompts = readPrompts();
  const runs = configurations.length * prompts.length;
  const status = getOllamaStatus();
  const serverUp = status ? status.running : null;

  cardsEl.innerHTML = `
    <div class="card">
      <div class="card-label">${escapeHtml(t("bench.cardConfigs"))}</div>
      <div class="card-value" dir="ltr">${configurations.length}</div>
      <div class="card-sub">${escapeHtml(t("bench.cardConfigsSub"))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("bench.cardPrompts"))}</div>
      <div class="card-value" dir="ltr">${prompts.length}</div>
      <div class="card-sub">${escapeHtml(t("bench.cardPromptsSub"))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("bench.cardTotalRuns"))}</div>
      <div class="card-value ${runs > 0 ? "" : "is-unknown"}" dir="ltr">${runs || "—"}</div>
      <div class="card-sub">${escapeHtml(t("bench.cardTotalRunsSub"))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("bench.cardServer"))}</div>
      ${
        serverUp === null
          ? '<div class="card-value is-unknown">—</div>'
          : `<div class="card-value ${serverUp ? "is-good" : "is-bad"}">${escapeHtml(
              t(serverUp ? "value.running" : "value.stopped")
            )}</div>`
      }
      <div class="card-sub">${escapeHtml(
        t(serverUp ? "bench.cardServerReady" : "bench.cardServerNotReady")
      )}</div>
    </div>`;
}

/** Refresh everything that depends on the current setup. */
function renderSetup() {
  const configurations = getConfigurations();

  renderConfigList(configListEl);
  renderCards();

  configCountEl.textContent =
    configurations.length === 0
      ? t("bench.noConfigsYet")
      : tn(configurations.length, "bench.configReady", "bench.configsReady");

  clearBtn.disabled = configurations.length === 0 || isRunning;
  exportBtn.disabled = configurations.length === 0;

  updateRunState();
}

/** Enable or disable the run button and explain whichever state it is in. */
function updateRunState() {
  if (isRunning) {
    runStateEl.className = "control-title";
    runStateEl.textContent = t("bench.inProgress");
    runNoteEl.textContent = t("bench.inProgressNote");
    runBtn.disabled = true;
    return;
  }

  const configurations = getConfigurations();
  const prompts = readPrompts();
  const status = getOllamaStatus();

  const blockers = [];

  if (status && status.running === false) {
    blockers.push(t("bench.missingServer"));
  }

  if (!modelEl.value) {
    blockers.push(t("bench.missingModel"));
  }

  if (prompts.length === 0) {
    blockers.push(t("bench.missingPrompts"));
  }

  if (configurations.length === 0) {
    blockers.push(t("bench.missingConfigs"));
  }

  if (blockers.length > 0) {
    runStateEl.className = "control-title is-bad";
    runStateEl.textContent = t("bench.notReady");
    runNoteEl.textContent = t("bench.stillMissing", {
      items: blockers.join(t("bench.listSeparator")),
    });
    runBtn.disabled = true;
    return;
  }

  const runs = configurations.length * prompts.length;

  runStateEl.className = "control-title is-good";
  runStateEl.textContent = t("bench.ready");
  runNoteEl.textContent = t("bench.readyNote", { n: runs, model: modelEl.value });
  runBtn.disabled = false;
}

/**
 * Open or close the manual editor.
 *
 * @param {boolean} open Whether the editor should be visible.
 */
function toggleEditor(open) {
  editorEl.classList.toggle("is-hidden", !open);

  if (open) {
    toggleImport(false);
    focusEditor();
  }
}

/**
 * Open or close the import drawer.
 *
 * @param {boolean} open Whether the drawer should be visible.
 */
function toggleImport(open) {
  importEl.classList.toggle("is-hidden", !open);

  if (open) {
    editorEl.classList.add("is-hidden");
  } else {
    clearPreview();
  }
}

/** Put the editor into "add a new configuration" mode. */
function openForAdd() {
  editingId = null;
  editingExtras = {};
  editorTitleEl.textContent = t("bench.editorAdd");
  editorSaveBtn.textContent = t("btn.add");
  resetEditor();
  toggleEditor(true);
}

/**
 * Put the editor into "edit this configuration" mode.
 *
 * @param {number} id Configuration id.
 */
function openForEdit(id) {
  const config = getConfiguration(id);

  if (!config) {
    return;
  }

  editingId = config.id;
  editingExtras = fillEditor(config);
  editorTitleEl.textContent = t("bench.editorEdit", { name: config.name });
  editorSaveBtn.textContent = t("btn.save");
  toggleEditor(true);
}

function bindEditor() {
  addBtn.addEventListener("click", openForAdd);
  document.getElementById("btn-editor-close").addEventListener("click", () => toggleEditor(false));
  document.getElementById("btn-editor-reset").addEventListener("click", () => {
    resetEditor();
    editingExtras = {};
  });

  editorEl.addEventListener("submit", (event) => {
    event.preventDefault();

    const draft = readEditor(editingExtras);

    if (Object.keys(draft.options).length === 0) {
      toast("error", t("bench.nothingToSave"), t("bench.nothingToSaveBody"));
      return;
    }

    if (editingId === null) {
      const stored = addConfiguration(draft);
      toast("success", t("bench.configAdded"), stored.name);
    } else {
      const stored = updateConfiguration(editingId, draft);
      toast("success", t("bench.configSaved"), stored ? stored.name : "");
    }

    renderSetup();
    toggleEditor(false);
  });
}

function bindConfigList() {
  // Cards are re-rendered on every change, so the container carries the handler.
  configListEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-config-act]");

    if (!button || isRunning) {
      return;
    }

    const id = Number(button.dataset.configId);

    if (button.dataset.configAct === "edit") {
      openForEdit(id);
      return;
    }

    if (button.dataset.configAct === "copy") {
      const copy = duplicateConfiguration(id);
      renderSetup();

      if (copy) {
        toast("success", t("bench.configDuplicated"), copy.name);
      }
      return;
    }

    if (button.dataset.configAct === "remove") {
      // If the card being removed is the one open in the editor, the editor is
      // now pointing at nothing, so close it.
      if (editingId === id) {
        toggleEditor(false);
        editingId = null;
      }

      removeConfiguration(id);
      renderSetup();
    }
  });

  clearBtn.addEventListener("click", () => {
    if (!window.confirm(t("bench.clearConfirm"))) {
      return;
    }

    clearConfigurations();
    editingId = null;
    toggleEditor(false);
    renderSetup();
  });
}

/** Hide the import preview and forget what was parsed. */
function clearPreview() {
  pendingImport = null;
  previewEl.classList.add("is-hidden", "is-bad");
  previewEl.innerHTML = "";
}

/**
 * Show why an import could not be read.
 *
 * @param {string} message Server or client message.
 */
function showPreviewError(message) {
  pendingImport = null;
  previewEl.classList.remove("is-hidden");
  previewEl.classList.add("is-bad");
  previewEl.innerHTML = `
    <div class="bench-preview-head">
      <span class="bench-preview-title">${escapeHtml(t("bench.importUnreadable"))}</span>
    </div>
    <div class="bench-preview-error">${escapeHtml(message)}</div>`;
}

/**
 * Show what an import was understood to contain, before applying it.
 *
 * Applying is a separate step because a file may also carry a model and prompts,
 * which would otherwise silently overwrite what the user already typed.
 *
 * @param {object} document_ Parsed document from the parse endpoint.
 * @param {boolean} [fromFile] Whether the source is a file name rather than the
 *     paste box. The endpoint labels pasted input in English, so the label is
 *     produced here instead of being echoed back.
 */
function showPreview(document_, fromFile = true) {
  pendingImport = document_;

  const source = fromFile ? document_.source || "" : t("bench.pastedText");

  const rows = document_.configurations
    .map(
      (config) => `
        <div class="bench-preview-row">
          <span class="bench-preview-name" dir="ltr">${escapeHtml(config.name)}</span>
          <span class="bench-preview-options" dir="ltr">${escapeHtml(
            Object.entries(config.options)
              .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join("|") : value}`)
              .join("  ")
          )}</span>
        </div>`
    )
    .join("");

  const extras = [];

  if (document_.model) {
    extras.push(t("bench.extraModel", { model: document_.model }));
  }

  if (document_.prompts.length > 0) {
    extras.push(
      tn(document_.prompts.length, "bench.extraPrompt", "bench.extraPrompts")
    );
  }

  const note = extras.length
    ? `<span class="bench-preview-source">${escapeHtml(
        t("bench.alsoCarries", { extras: extras.join(t("bench.and")) })
      )}</span>`
    : "";

  previewEl.classList.remove("is-hidden", "is-bad");
  previewEl.innerHTML = `
    <div class="bench-preview-head">
      <span class="bench-preview-title">${escapeHtml(
        tn(document_.configurations.length, "bench.foundConfig", "bench.foundConfigs")
      )}</span>
      <span class="bench-preview-source">${escapeHtml(source)}</span>
      ${note}
    </div>
    <div class="bench-preview-list">${rows}</div>
    <div class="bench-preview-foot">
      <button type="button" class="btn btn-sm" data-import-act="replace">${escapeHtml(
        t("bench.replaceExisting")
      )}</button>
      <button type="button" class="btn btn-sm btn-primary" data-import-act="append">${escapeHtml(
        t("bench.addToList")
      )}</button>
    </div>`;
}

/**
 * Validate an uploaded file against the server's schema.
 *
 * @param {File} file File chosen or dropped by the user.
 */
async function checkFile(file) {
  if (!file) {
    return;
  }

  const form = new FormData();
  form.append("file", file);

  try {
    const { data } = await api("/api/benchmark/parse", { method: "POST", body: form });
    showPreview(data);
  } catch (error) {
    showPreviewError(error.message);
  }
}

/** Validate whatever is in the paste box. */
async function checkPastedText() {
  const text = pasteEl.value.trim();

  if (!text) {
    showPreviewError(t("bench.pasteFirst"));
    return;
  }

  try {
    const { data } = await postJson("/api/benchmark/parse", { text });
    showPreview(data, false);
  } catch (error) {
    showPreviewError(error.message);
  }
}

/**
 * Apply a previewed import.
 *
 * @param {"append"|"replace"} mode Whether to keep the existing configurations.
 */
function applyImport(mode) {
  if (!pendingImport) {
    return;
  }

  if (mode === "replace") {
    clearConfigurations();
    editingId = null;
    toggleEditor(false);
  }

  addConfigurations(pendingImport.configurations);

  // A file may describe a whole setup, not just configurations. Those fields are
  // only taken when the user has not already filled them in themselves.
  if (pendingImport.model && getInstalledModels().includes(pendingImport.model)) {
    modelEl.value = pendingImport.model;
  }

  if (pendingImport.prompts.length > 0 && (mode === "replace" || readPrompts().length === 0)) {
    promptsEl.value = pendingImport.prompts.join("\n\n");
  }

  if (pendingImport.include_output !== null && pendingImport.include_output !== undefined) {
    includeOutputEl.checked = pendingImport.include_output;
  }

  toast(
    "success",
    t(mode === "replace" ? "bench.configsReplaced" : "bench.configsAdded"),
    t("bench.nowInComparison", { n: getConfigurations().length })
  );

  renderSetup();
  toggleImport(false);
}

function bindImport() {
  importBtn.addEventListener("click", () => toggleImport(importEl.classList.contains("is-hidden")));
  document.getElementById("btn-import-close").addEventListener("click", () => toggleImport(false));
  document.getElementById("btn-paste-check").addEventListener("click", checkPastedText);

  dropzoneEl.addEventListener("click", () => fileEl.click());
  dropzoneEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileEl.click();
    }
  });

  fileEl.addEventListener("change", () => {
    checkFile(fileEl.files[0]);
    // Reset so choosing the same file twice in a row fires change again.
    fileEl.value = "";
  });

  ["dragenter", "dragover"].forEach((name) => {
    dropzoneEl.addEventListener(name, (event) => {
      event.preventDefault();
      dropzoneEl.classList.add("is-hover");
    });
  });

  ["dragleave", "drop"].forEach((name) => {
    dropzoneEl.addEventListener(name, (event) => {
      event.preventDefault();
      dropzoneEl.classList.remove("is-hover");
    });
  });

  dropzoneEl.addEventListener("drop", (event) => {
    checkFile(event.dataTransfer.files[0]);
  });

  previewEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-import-act]");

    if (button) {
      applyImport(button.dataset.importAct);
    }
  });
}

/** Download the current setup as a file that can be uploaded again later. */
async function exportSetup() {
  const restore = setButtonBusy(exportBtn);

  try {
    const response = await fetch("/api/benchmark/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelEl.value,
        prompts: readPrompts(),
        include_output: includeOutputEl.checked,
        configurations: toPayload(),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Request failed (${response.status})`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "benchmark-configurations.json";
    link.click();
    URL.revokeObjectURL(url);

    toast("success", t("bench.exported"), "benchmark-configurations.json");
  } catch (error) {
    toast("error", t("bench.exportFailed"), error.message);
  } finally {
    restore();
  }
}

/**
 * Show or hide the progress bar for a running job.
 *
 * The server reports elapsed time but not how far along it is: compare_tests
 * returns only when every configuration is finished, so there is no per-prompt
 * progress to report. The bar states what is being done and for how long instead
 * of implying a percentage it cannot know.
 *
 * @param {object|null} job Job snapshot, or null to hide the bar.
 */
function renderProgress(job) {
  if (!job || job.status !== "running") {
    progressEl.classList.add("is-hidden");
    progressEl.innerHTML = "";
    return;
  }

  progressEl.classList.remove("is-hidden");
  progressEl.innerHTML = `
    <span class="spinner"></span>
    <span class="bench-progress-text">${escapeHtml(
      t("bench.progressText", {
        runs: job.planned_runs,
        configs: job.configurations.length,
        model: job.model,
      })
    )}</span>
    <span class="bench-progress-meta">${escapeHtml(
      t("bench.progressMeta", {
        time: job.started_at,
        seconds: Math.round(job.elapsed_seconds),
      })
    )}</span>`;
}

/**
 * Lock or unlock every control that would change the setup mid-run.
 *
 * @param {boolean} running Whether a comparison is in flight.
 */
function setRunning(running) {
  isRunning = running;

  [modelEl, promptsEl, includeOutputEl, addBtn, importBtn].forEach((el) => {
    el.disabled = running;
  });

  if (running) {
    toggleEditor(false);
    toggleImport(false);
  }

  renderSetup();
}

/**
 * Apply a job snapshot to the page.
 *
 * @param {object|null} job Snapshot from the run or status endpoint.
 */
function applyJob(job) {
  if (!job) {
    setRunning(false);
    renderProgress(null);
    metaEl.textContent = "";
    return;
  }

  if (job.status === "running") {
    setRunning(true);
    renderProgress(job);
    metaEl.textContent = t("bench.runningSince", { time: job.started_at });
    return;
  }

  setRunning(false);
  renderProgress(null);

  if (job.status === "failed") {
    showAlert(errorEl, t("bench.comparisonFailed", { error: job.error }));
    resultsEl.innerHTML = `<div class="empty-state">${escapeHtml(t("bench.didNotFinish"))}</div>`;
    metaEl.textContent = t("bench.failedAt", { time: job.finished_at || "" });
    return;
  }

  hideAlert(errorEl);
  renderResults(resultsEl, job);
  metaEl.textContent = t("bench.finishedAt", { time: job.finished_at || "" });

  const discard = document.getElementById("btn-bench-discard");

  if (discard) {
    discard.addEventListener("click", async () => {
      try {
        await postJson("/api/benchmark/clear", {});
      } catch (error) {
        toast("error", t("bench.cannotDiscard"), error.message);
        return;
      }

      resultsEl.innerHTML = `<div class="empty-state">${escapeHtml(t("bench.noRunYet"))}</div>`;
      metaEl.textContent = "";
    });
  }
}

/** Poll the job endpoint until the run settles. */
function startPolling() {
  window.clearInterval(pollTimer);

  pollTimer = window.setInterval(async () => {
    let job;

    try {
      job = (await api("/api/benchmark/status")).data;
    } catch (error) {
      // A failed poll says nothing about the run itself, so keep polling and let
      // the alert explain the gap.
      showAlert(errorEl, t("bench.lostTrack", { error: error.message }));
      return;
    }

    hideAlert(errorEl);
    applyJob(job);

    if (!job || job.status !== "running") {
      window.clearInterval(pollTimer);
      pollTimer = null;

      if (job && job.status === "done") {
        toast(
          "success",
          t("bench.finished"),
          t("bench.finishedBody", { n: job.result.tests.length })
        );
      } else if (job && job.status === "failed") {
        toast("error", t("bench.failed"), job.error);
      }
    }
  }, POLL_INTERVAL_MS);
}

function bindRun() {
  runBtn.addEventListener("click", async () => {
    const prompts = readPrompts();
    const restore = setButtonBusy(runBtn);

    try {
      const { data } = await postJson("/api/benchmark/run", {
        model: modelEl.value,
        prompts,
        include_output: includeOutputEl.checked,
        configurations: toPayload(),
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
  });
}

/**
 * Refresh the parts of the tab that depend on other tabs' data.
 *
 * The model dropdown is filled by the Models panel and the server status card
 * comes from the Ollama panel, so this is called after either of those loads.
 * Repopulating the dropdown re-enables it, which would unlock the setup while a
 * comparison is still running, so the lock is reapplied here.
 */
export function refreshBenchmarkPanel() {
  setRunning(isRunning);
}

/** Bind the Benchmark tab and pick up any run already in flight. */
export async function initBenchmarkPanel() {
  bindEditor();
  bindConfigList();
  bindImport();
  bindRun();

  promptsEl.addEventListener("input", () => {
    renderCards();
    updateRunState();
  });

  modelEl.addEventListener("change", updateRunState);
  exportBtn.addEventListener("click", exportSetup);

  renderSetup();

  try {
    const { data } = await api("/api/benchmark/schema");
    buildEditor(data.options);
  } catch (error) {
    showAlert(errorEl, t("bench.optionsFailed", { error: error.message }));
  }

  // A reload during a run must not lose it: the job lives on the server, so pick
  // whatever is there back up.
  try {
    const { data } = await api("/api/benchmark/status");
    applyJob(data);

    if (data && data.status === "running") {
      startPolling();
    }
  } catch (error) {
    showAlert(errorEl, t("bench.statusFailed", { error: error.message }));
  }
}
