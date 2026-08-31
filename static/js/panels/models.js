// Models tab controller: load the tables and bind every model action.

import { runAction } from "../lib/actions.js";
import { api, postJson } from "../lib/api.js";
import { hideAlert, showAlert, skeletons } from "../lib/format.js";
import { t } from "../lib/i18n.js";
import { getInstalledModels, setInstalledModels } from "../lib/state.js";
import { setButtonBusy, toast } from "../lib/toast.js";
import {
  formatModelInfo,
  renderModelsCards,
  renderModelsTable,
  renderRunningTable,
  syncModelSelects,
} from "./models_render.js";

const DEFAULT_KEEP_ALIVE = "10m";

// Parameters offered by the configure form; blanks are omitted from the request.
const CONFIG_PARAMS = [
  "num_ctx",
  "temperature",
  "top_p",
  "top_k",
  "repeat_penalty",
  "num_predict",
];

const modelsErrorEl = document.getElementById("models-error");
const modelsMetaEl = document.getElementById("models-meta");
const refreshModelsBtn = document.getElementById("btn-refresh-models");

/**
 * Reload both model tables and the dropdowns.
 *
 * @param {{quiet?: boolean}} [options] Skip the loading placeholders, used when
 *     reloading after an action that already showed its own progress.
 */
export async function loadModels({ quiet = false } = {}) {
  const restore = setButtonBusy(quiet ? null : refreshModelsBtn);

  if (!quiet) {
    modelsMetaEl.textContent = t("system.scanning");
    document.getElementById("models-cards").innerHTML = skeletons(3);
  }

  try {
    const [listRes, runningRes] = await Promise.all([
      api("/api/ollama/models"),
      api("/api/ollama/models/running"),
    ]);

    hideAlert(modelsErrorEl);

    const list = listRes.data;
    const running = runningRes.data;

    setInstalledModels((list.rows || []).map((row) => row.name).filter(Boolean));

    renderModelsCards(getInstalledModels().length, (running.rows || []).length);
    renderModelsTable(list);
    renderRunningTable(running);
    syncModelSelects();

    modelsMetaEl.textContent = t("models.updatedAt", {
      time: new Date().toLocaleTimeString(),
    });
  } catch (error) {
    showAlert(modelsErrorEl, t("models.listFailed", { error: error.message }));
    modelsMetaEl.textContent = "";
  } finally {
    restore();
  }
}

/**
 * Run the action a table row button asks for.
 *
 * @param {string} act Action name from the button's data-act.
 * @param {string} model Target model name.
 * @param {HTMLButtonElement} button Button that was clicked.
 * @returns {Promise<boolean>} Whether the action ran and succeeded.
 */
function rowAction(act, model, button) {
  if (act === "info") {
    return runAction(
      `show_model_info("${model}")`,
      t("models.reading", { model }),
      () => api(`/api/ollama/models/info?model=${encodeURIComponent(model)}`),
      { onSuccess: (res) => formatModelInfo(res.data), refresh: false, button }
    );
  }

  if (act === "load") {
    return runAction(
      `load_model("${model}")`,
      t("models.loading", { model }),
      () => postJson("/api/ollama/models/load", { model, keep_alive: DEFAULT_KEEP_ALIVE }),
      {
        button,
        onSuccess: (res) =>
          t(res.already_loaded ? "models.alreadyLoaded" : "models.loaded", { model }),
      }
    );
  }

  if (act === "stop") {
    return runAction(
      `stop_model("${model}")`,
      t("models.stopping", { model }),
      () => postJson("/api/ollama/models/stop", { model }),
      { button, onSuccess: (res) => res.data || t("models.stopped", { model }) }
    );
  }

  if (act === "remove") {
    // Deleting a model is not recoverable from this UI, so confirm first.
    if (!window.confirm(t("models.removeConfirm", { model }))) {
      return Promise.resolve(false);
    }

    return runAction(
      `remove_model("${model}")`,
      t("models.removing", { model }),
      () => postJson("/api/ollama/models/remove", { model }),
      { button, onSuccess: (res) => res.data || t("models.removed", { model }) }
    );
  }

  return Promise.resolve(false);
}

function bindTableActions() {
  // Rows are re-rendered on every refresh, so listen on the containers instead
  // of binding each button.
  ["models-table", "running-table"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (event) => {
      const button = event.target.closest("[data-act]");

      if (!button) {
        return;
      }

      rowAction(button.dataset.act, button.dataset.model, button);
    });
  });
}

function bindRunForm() {
  document.getElementById("form-run").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const model = form.model.value;
    const prompt = form.prompt.value;
    const button = form.querySelector('button[type="submit"]');

    if (!model) {
      toast("error", t("models.cannotRun"), t("models.selectModelFirst"));
      return;
    }

    if (!prompt.trim()) {
      toast("error", t("models.cannotRun"), t("models.enterPromptFirst"));
      return;
    }

    runAction(
      `run_model("${model}")`,
      t("models.running", { model }),
      () => postJson("/api/ollama/models/run", { model, prompt }),
      { refresh: false, button }
    );
  });
}

function bindLoadForm() {
  document.getElementById("form-load").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const model = form.model.value;
    const keepAlive = form.keep_alive.value.trim() || DEFAULT_KEEP_ALIVE;
    const button = form.querySelector('button[type="submit"]');

    if (!model) {
      toast("error", t("models.cannotLoad"), t("models.selectModelFirst"));
      return;
    }

    runAction(
      `load_model("${model}", keep_alive="${keepAlive}")`,
      t("models.loading", { model }),
      () => postJson("/api/ollama/models/load", { model, keep_alive: keepAlive }),
      {
        button,
        onSuccess: (res) =>
          t(res.already_loaded ? "models.alreadyLoaded" : "models.loaded", { model }),
      }
    );
  });
}

function bindAddForm() {
  document.getElementById("form-add").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.model_name.value.trim();
    const path = form.model_path.value.trim();
    const button = form.querySelector('button[type="submit"]');

    if (!name || !path) {
      toast("error", t("models.cannotAdd"), t("models.cannotAddBody"));
      return;
    }

    runAction(
      `add_model("${name}")`,
      t("models.adding", { model: name }),
      () => postJson("/api/ollama/models/add", { model_name: name, model_path: path }),
      { button, onSuccess: (res) => res.data || t("models.added", { model: name }) }
    );
  });
}

function bindConfigureForm() {
  document.getElementById("form-configure").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const source = form.source_model.value;
    const target = form.target_model.value.trim();
    const button = form.querySelector('button[type="submit"]');

    const parameters = {};
    CONFIG_PARAMS.forEach((key) => {
      const value = form[key].value.trim();
      if (value !== "") {
        parameters[key] = Number(value);
      }
    });

    if (!source || !target) {
      toast("error", t("models.cannotCreate"), t("models.cannotCreateBody"));
      return;
    }

    if (Object.keys(parameters).length === 0) {
      toast("error", t("models.cannotCreate"), t("models.needOneParam"));
      return;
    }

    runAction(
      `configure_model("${source}" -> "${target}")`,
      t("models.creating", { model: target }),
      () =>
        postJson("/api/ollama/models/configure", {
          source_model: source,
          target_model: target,
          parameters,
        }),
      {
        button,
        onSuccess: (res) => res.data || t("models.created", { target, source }),
      }
    );
  });
}

/** Bind the Models tab controls. */
export function initModelsPanel() {
  refreshModelsBtn.addEventListener("click", () => loadModels());
  bindTableActions();
  bindRunForm();
  bindLoadForm();
  bindAddForm();
  bindConfigureForm();
}
