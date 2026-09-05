// Benchmark tab controller.
//
// One set of inputs decides everything: the prompts, the models ticked, and
// the configurations built. What kind of test that adds up to follows from the
// counts rather than from a mode the user has to pick first —
//
//   one model  · no or one configuration  → measure that model
//   one model  · several configurations   → compare the configurations
//   many models · no or one configuration → compare the models
//   many models · several configurations  → tournament: each model races
//                                           under the configuration paired
//                                           with it
//
// The plan panel names the kind before the run starts, and the run button
// dispatches to whichever endpoint that kind belongs to: the configuration
// comparison for a single model, the model comparison for several. Both
// answer with the same job shape, so progress, results and history are one
// code path from here on.

import { api, postJson } from "../lib/api.js";
import { escapeHtml, hideAlert, showAlert } from "../lib/format.js";
import { t, tn } from "../lib/i18n.js";
import { getInstalledModels, getOllamaStatus } from "../lib/state.js";
import { setButtonBusy, toast } from "../lib/toast.js";
import {
  addConfiguration,
  addConfigurations,
  clearConfigurations,
  duplicateConfiguration,
  getConfiguration,
  getConfigurations,
  removeConfiguration,
  toPayload,
  updateConfiguration,
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

const MAX_MODELS = 6;

// The two endpoints a run can go to. Which one is chosen follows from the
// model count, and both answer with the same job snapshot.
const SINGLE = {
  run: "/api/benchmark/run",
  status: "/api/benchmark/status",
  cancel: "/api/benchmark/cancel",
  clear: "/api/benchmark/clear",
};

const MULTI = {
  run: "/api/models-compare/run",
  status: "/api/models-compare/status",
  cancel: "/api/models-compare/cancel",
  clear: "/api/models-compare/clear",
};

const errorEl = document.getElementById("bench-error");
const metaEl = document.getElementById("bench-meta");
const cardsEl = document.getElementById("bench-cards");

const promptsEl = document.getElementById("bench-prompts");
const repetitionsEl = document.getElementById("bench-repetitions");
const includeOutputEl = document.getElementById("bench-include-output");

const modelListEl = document.getElementById("bench-models-list");
const modelCountEl = document.getElementById("bench-model-count");

const configListEl = document.getElementById("bench-config-list");
const configCountEl = document.getElementById("bench-config-count");
const addBtn = document.getElementById("btn-config-add");
const importBtn = document.getElementById("btn-config-import");
const clearBtn = document.getElementById("btn-config-clear");

const pairingEl = document.getElementById("bench-pairing");
const pairingRowsEl = document.getElementById("bench-pairing-rows");

const editorEl = document.getElementById("bench-editor");
const editorTitleEl = document.getElementById("bench-editor-title");
const editorSaveBtn = document.getElementById("btn-editor-save");

const importEl = document.getElementById("bench-import");
const dropzoneEl = document.getElementById("bench-dropzone");
const fileEl = document.getElementById("bench-file");
const pasteEl = document.getElementById("bench-paste-text");
const previewEl = document.getElementById("bench-import-preview");

const planEl = document.getElementById("bench-plan");
const runBtn = document.getElementById("btn-bench-run");
const runStateEl = document.getElementById("bench-run-state");
const runNoteEl = document.getElementById("bench-run-note");
const progressEl = document.getElementById("bench-progress");
const resultsEl = document.getElementById("bench-results");
const exportBtn = document.getElementById("btn-bench-export");

// Models ticked, in tick order: a comparison measures them in this sequence.
let selectedModels = [];

// Tournament pairing: model name → configuration id. Only consulted when the
// plan is a tournament; everything else runs one shared configuration.
let pairing = new Map();

// Id of the configuration being edited, or null when the editor is adding a new
// one. Options the schema has no field for are held here across a save.
let editingId = null;
let editingExtras = {};

// The last parsed-but-not-yet-applied import.
let pendingImport = null;

let pollTimer = null;
let isRunning = false;

// Which endpoint the job currently on screen belongs to, so cancel and discard
// reach the right service after a reload.
let activeEndpoints = SINGLE;

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

/** Read the repetitions field, clamped to the range the server accepts. */
function readRepetitions() {
  const value = Number.parseInt(repetitionsEl.value, 10);
  return Number.isInteger(value) && value >= 1 ? Math.min(value, 10) : 1;
}

/**
 * Work out which of the four test kinds the current inputs describe.
 *
 * The kind is derived, never chosen: it follows from how many models are
 * ticked and how many configurations exist, which is the whole point of the
 * unified form.
 *
 * @returns {{kind: string, models: number, configs: number, runs: number}}
 *     The plan: its kind key, the counts behind it, and the number of
 *     generations it will perform.
 */
function readPlan() {
  const models = selectedModels.length;
  const configs = getConfigurations().length;
  const prompts = readPrompts().length;
  const reps = readRepetitions();

  let kind = "none";

  if (models === 1) {
    kind = configs > 1 ? "configs" : "single";
  } else if (models > 1) {
    kind = configs > 1 ? "tournament" : "models";
  }

  // A tournament runs one configuration per model; every other kind runs each
  // configuration (or the single default) against the one model.
  const passes =
    kind === "configs" ? configs : kind === "tournament" ? models : models;

  return {
    kind,
    models,
    configs,
    prompts,
    reps,
    runs: passes * prompts * reps,
  };
}

/** Paint the summary cards at the top of the tab. */
function renderCards() {
  const plan = readPlan();
  const status = getOllamaStatus();
  const serverUp = status ? status.running : null;

  cardsEl.innerHTML = `
    <div class="card">
      <div class="card-label">${escapeHtml(t("bench.cardModels"))}</div>
      <div class="card-value ${plan.models ? "" : "is-unknown"}" dir="ltr">${
        plan.models || "—"
      }</div>
      <div class="card-sub">${escapeHtml(t("bench.cardModelsSub"))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("bench.cardConfigs"))}</div>
      <div class="card-value" dir="ltr">${plan.configs}</div>
      <div class="card-sub">${escapeHtml(t("bench.cardConfigsSub"))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("bench.cardPrompts"))}</div>
      <div class="card-value" dir="ltr">${plan.prompts}</div>
      <div class="card-sub">${escapeHtml(t("bench.cardPromptsSub"))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("bench.cardTotalRuns"))}</div>
      <div class="card-value ${plan.runs > 0 ? "" : "is-unknown"}" dir="ltr">${
        plan.runs || "—"
      }</div>
      <div class="card-sub">${escapeHtml(
        plan.reps > 1
          ? t("bench.cardTotalRunsRepsSub", { reps: plan.reps })
          : t("bench.cardTotalRunsSub")
      )}</div>
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

/** Paint the model tick-list from the installed models. */
function renderModelList() {
  const installed = getInstalledModels();

  if (installed.length === 0) {
    modelListEl.innerHTML = `<span class="bench-models-empty">${escapeHtml(
      t("bench.modelsNoneInstalled")
    )}</span>`;
    return;
  }

  modelListEl.innerHTML = installed
    .map(
      (model) => `
        <label class="bench-models-item">
          <input type="checkbox" value="${escapeHtml(model)}"
                 ${selectedModels.includes(model) ? "checked" : ""}
                 ${isRunning ? "disabled" : ""}>
          <span dir="ltr">${escapeHtml(model)}</span>
        </label>`
    )
    .join("");

  modelListEl.querySelectorAll("input[type=checkbox]").forEach((box) => {
    box.addEventListener("change", () => {
      if (box.checked) {
        if (selectedModels.length >= MAX_MODELS) {
          box.checked = false;
          toast(
            "error",
            t("bench.modelsTooMany"),
            t("bench.modelsTooManyBody", { n: MAX_MODELS })
          );
          return;
        }

        // Tick order is run order, so a newly ticked model goes last.
        selectedModels.push(box.value);
      } else {
        selectedModels = selectedModels.filter((name) => name !== box.value);
        pairing.delete(box.value);
      }

      renderSetup();
    });
  });
}

/**
 * Paint the tournament's pairing table, or hide it when the plan is not one.
 *
 * A tournament is the only kind where a model does not share the run's single
 * configuration, so this is the only place a per-model choice makes sense.
 */
function renderPairing() {
  const plan = readPlan();
  const configurations = getConfigurations();

  if (plan.kind !== "tournament") {
    pairingEl.classList.add("is-hidden");
    pairingRowsEl.innerHTML = "";
    return;
  }

  pairingEl.classList.remove("is-hidden");

  pairingRowsEl.innerHTML = selectedModels
    .map((model, index) => {
      // Unpaired models fall to the configuration at their own position, so a
      // tournament is runnable the moment it is described.
      const fallback = configurations[index % configurations.length];
      const chosen = pairing.get(model) ?? fallback.id;

      const options = configurations
        .map(
          (config) =>
            `<option value="${config.id}" ${
              config.id === chosen ? "selected" : ""
            }>${escapeHtml(config.name)}</option>`
        )
        .join("");

      return `
        <div class="bench-pairing-row">
          <span class="bench-pairing-model" dir="ltr">${escapeHtml(model)}</span>
          <select class="input is-ltr bench-pairing-select" dir="ltr"
                  data-pair-model="${escapeHtml(model)}" ${isRunning ? "disabled" : ""}>
            ${options}
          </select>
        </div>`;
    })
    .join("");

  pairingRowsEl.querySelectorAll("[data-pair-model]").forEach((select) => {
    select.addEventListener("change", () => {
      pairing.set(select.dataset.pairModel, Number(select.value));
      renderPlan();
    });
  });
}

/** Paint the plan panel: which of the four kinds the inputs describe. */
function renderPlan() {
  const plan = readPlan();

  if (plan.kind === "none") {
    planEl.className = "bench-plan is-empty";
    planEl.innerHTML = `
      <span class="bench-plan-label">${escapeHtml(t("bench.planNoneLabel"))}</span>
      <span class="bench-plan-note">${escapeHtml(t("bench.planNoneNote"))}</span>`;
    return;
  }

  // The factors behind the total, in run order. Configurations only appear
  // when the plan actually varies them; the repetition count only earns its
  // place when it is above one.
  const factors = [];

  factors.push(
    tn(plan.models, "bench.factorModel", "bench.factorModels", {
      n: plan.models,
    })
  );

  if (plan.kind === "configs") {
    factors.push(
      tn(plan.configs, "bench.factorConfig", "bench.factorConfigs", {
        n: plan.configs,
      })
    );
  }

  factors.push(
    tn(plan.prompts, "bench.factorPrompt", "bench.factorPrompts", {
      n: plan.prompts,
    })
  );

  if (plan.reps > 1) {
    factors.push(
      tn(plan.reps, "bench.factorRep", "bench.factorReps", { n: plan.reps })
    );
  }

  const counts = `<span class="bench-plan-counts" dir="ltr">${escapeHtml(
    factors.join(" × ")
  )} = ${plan.runs}</span>`;

  planEl.className = `bench-plan is-${plan.kind}`;
  planEl.innerHTML = `
    <span class="bench-plan-badge">${escapeHtml(t(`bench.plan.${plan.kind}`))}</span>
    <span class="bench-plan-note">${escapeHtml(
      t(`bench.planNote.${plan.kind}`, {
        models: plan.models,
        configs: plan.configs,
        prompts: plan.prompts,
        reps: plan.reps,
        runs: plan.runs,
      })
    )}</span>
    ${counts}`;
}

/** Refresh everything that depends on the current setup. */
function renderSetup() {
  const configurations = getConfigurations();

  renderModelList();
  renderConfigList(configListEl);
  renderPairing();
  renderCards();
  renderPlan();

  modelCountEl.textContent =
    selectedModels.length === 0
      ? t("bench.noModelsYet")
      : tn(selectedModels.length, "bench.modelReady", "bench.modelsReadyCount");

  configCountEl.textContent =
    configurations.length === 0
      ? t("bench.noConfigsYet")
      : tn(configurations.length, "bench.configReady", "bench.configsReady");

  clearBtn.disabled = configurations.length === 0 || isRunning;
  exportBtn.disabled = configurations.length === 0;
  repetitionsEl.disabled = isRunning;

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

  const plan = readPlan();
  const status = getOllamaStatus();
  const blockers = [];

  if (status && status.running === false) {
    blockers.push(t("bench.missingServer"));
  }

  if (plan.models === 0) {
    blockers.push(t("bench.missingModel"));
  }

  if (plan.prompts === 0) {
    blockers.push(t("bench.missingPrompts"));
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

  runStateEl.className = "control-title is-good";
  runStateEl.textContent = t("bench.ready");
  runNoteEl.textContent = t("bench.readyNote", { n: plan.runs });
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
      // A pairing that named it is stale; the table falls back to position.
      [...pairing.entries()].forEach(([model, configId]) => {
        if (configId === id) {
          pairing.delete(model);
        }
      });

      renderSetup();
    }
  });

  clearBtn.addEventListener("click", () => {
    if (!window.confirm(t("bench.clearConfirm"))) {
      return;
    }

    clearConfigurations();
    pairing.clear();
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
    pairing.clear();
    editingId = null;
    toggleEditor(false);
  }

  addConfigurations(pendingImport.configurations);

  // A file may describe a whole setup, not just configurations. Those fields are
  // only taken when the user has not already chosen them themselves.
  if (
    pendingImport.model &&
    getInstalledModels().includes(pendingImport.model) &&
    selectedModels.length === 0
  ) {
    selectedModels = [pendingImport.model];
  }

  if (pendingImport.prompts.length > 0 && (mode === "replace" || readPrompts().length === 0)) {
    promptsEl.value = pendingImport.prompts.join("\n\n");
  }

  if (pendingImport.repetitions && readRepetitions() === 1) {
    repetitionsEl.value = pendingImport.repetitions;
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
        model: selectedModels[0] || "",
        prompts: readPrompts(),
        include_output: includeOutputEl.checked,
        repetitions: readRepetitions(),
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
 * Core reports each step the run takes — which configuration or model, which
 * prompt, which repetition — so the bar shows a real percentage and the step
 * text names the stage.
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
      t(job.cross_model ? "bench.progressStepModel" : "bench.progressStep", {
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
      t("bench.progressStarting")
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
        t("bench.progressText", {
          runs: job.planned_runs,
          model: job.cross_model
            ? tn(job.models.length, "bench.oneModel", "bench.nModels")
            : job.model,
        })
      )}</span>
      <span class="bench-progress-meta">${escapeHtml(
        t("bench.progressMeta", {
          time: job.started_at,
          seconds: Math.round(job.elapsed_seconds),
        })
      )}</span>
      <button type="button" class="btn btn-sm" id="btn-bench-cancel">${escapeHtml(
        t("bench.cancelRun")
      )}</button>
    </div>
    ${bar}
    ${stepLine}`;

  const cancelBtn = document.getElementById("btn-bench-cancel");

  cancelBtn.addEventListener("click", async () => {
    const restore = setButtonBusy(cancelBtn);

    try {
      await postJson(activeEndpoints.cancel, {});
      // The next poll settles the job into its cancelled state.
      toast("pending", t("bench.cancelRun"), t("bench.cancelledBody"));
    } catch (error) {
      toast("error", t("bench.cannotCancel"), error.message);
    } finally {
      restore();
    }
  });
}

/**
 * Lock or unlock every control that would change the setup mid-run.
 *
 * @param {boolean} running Whether a benchmark is in flight.
 */
function setRunning(running) {
  isRunning = running;

  [promptsEl, includeOutputEl, repetitionsEl, addBtn, importBtn].forEach((el) => {
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

  if (job.status === "cancelled") {
    hideAlert(errorEl);
    resultsEl.innerHTML = `<div class="empty-state">${escapeHtml(t("bench.cancelledBody"))}</div>`;
    metaEl.textContent = t("bench.cancelledAt", { time: job.finished_at || "" });
    return;
  }

  hideAlert(errorEl);
  renderResults(resultsEl, job);
  metaEl.textContent = t("bench.finishedAt", { time: job.finished_at || "" });

  const discard = resultsEl.querySelector("[data-results-discard]");

  if (discard) {
    discard.addEventListener("click", async () => {
      try {
        await postJson(activeEndpoints.clear, {});
      } catch (error) {
        toast("error", t("bench.cannotDiscard"), error.message);
        return;
      }

      resultsEl.innerHTML = `<div class="empty-state">${escapeHtml(t("bench.noRunYet"))}</div>`;
      metaEl.textContent = "";
    });
  }
}

/** Poll whichever status endpoint the running job belongs to. */
function startPolling() {
  window.clearInterval(pollTimer);

  pollTimer = window.setInterval(async () => {
    let job;

    try {
      job = (await api(activeEndpoints.status)).data;
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
      } else if (job && job.status === "cancelled") {
        toast("info", t("bench.cancelled"), t("bench.cancelledBody"));
      }
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Build the request body for the plan the inputs describe, and name the
 * endpoint set it belongs to.
 *
 * @param {object} plan The plan from readPlan.
 * @returns {{endpoints: object, payload: object}} Where to post and what.
 */
function buildRequest(plan) {
  const prompts = readPrompts();
  const configurations = toPayload();
  const shared = {
    prompts,
    include_output: includeOutputEl.checked,
    repetitions: readRepetitions(),
  };

  if (plan.models === 1) {
    // One model: the configuration comparison serves both the plain speed
    // measurement (no configuration, so an empty options set stands in) and
    // the configuration comparison.
    return {
      endpoints: SINGLE,
      payload: {
        ...shared,
        model: selectedModels[0],
        configurations: configurations.length
          ? configurations
          : [{ name: t("bench.defaultConfigName"), options: {} }],
      },
    };
  }

  // Several models: the model comparison, with per-model overrides only when
  // the plan is a tournament.
  const modelConfigs = {};

  if (plan.kind === "tournament") {
    const stored = getConfigurations();

    selectedModels.forEach((model, index) => {
      const fallback = stored[index % stored.length];
      const chosenId = pairing.get(model) ?? fallback.id;
      const chosen = stored.find((config) => config.id === chosenId) || fallback;

      modelConfigs[model] = chosen.options;
    });
  }

  return {
    endpoints: MULTI,
    payload: {
      ...shared,
      models: selectedModels,
      config: configurations.length === 1 ? configurations[0].options : {},
      model_configs: modelConfigs,
    },
  };
}

function bindRun() {
  runBtn.addEventListener("click", async () => {
    const plan = readPlan();
    const { endpoints, payload } = buildRequest(plan);
    const restore = setButtonBusy(runBtn);

    try {
      const { data } = await postJson(endpoints.run, payload);

      activeEndpoints = endpoints;
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
 * The model list is filled by the Models panel and the server status card
 * comes from the Ollama panel, so this is called after either of those loads.
 */
export function refreshBenchmarkPanel() {
  // A model that was ticked and has since been removed cannot be benchmarked.
  const installed = getInstalledModels();
  selectedModels = selectedModels.filter((model) => installed.includes(model));

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
    renderPlan();
    updateRunState();
  });

  repetitionsEl.addEventListener("input", () => {
    renderCards();
    renderPlan();
    updateRunState();
  });

  exportBtn.addEventListener("click", exportSetup);

  renderSetup();

  try {
    const { data } = await api("/api/benchmark/schema");
    buildEditor(data.options);
  } catch (error) {
    showAlert(errorEl, t("bench.optionsFailed", { error: error.message }));
  }

  // A reload during a run must not lose it, and either service may be the one
  // holding it, so both are asked.
  try {
    const [single, multi] = await Promise.all([
      api(SINGLE.status),
      api(MULTI.status),
    ]);

    const running =
      single.data && single.data.status === "running"
        ? { job: single.data, endpoints: SINGLE }
        : multi.data && multi.data.status === "running"
          ? { job: multi.data, endpoints: MULTI }
          : null;

    if (running) {
      activeEndpoints = running.endpoints;
      applyJob(running.job);
      startPolling();
      return;
    }

    // Nothing running: show whichever finished job is the more recent one.
    const finished = [single.data, multi.data].filter(Boolean);

    if (finished.length > 0) {
      const latest = finished.reduce((newest, job) =>
        (job.finished_at || "") > (newest.finished_at || "") ? job : newest
      );

      activeEndpoints = latest.cross_model ? MULTI : SINGLE;
      applyJob(latest);
    }
  } catch (error) {
    showAlert(errorEl, t("bench.statusFailed", { error: error.message }));
  }
}
