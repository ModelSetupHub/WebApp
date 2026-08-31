// Ollama tab controller: installation state, server status, and process control.

import { runAction } from "../lib/actions.js";
import { api, postJson } from "../lib/api.js";
import {
  escapeHtml,
  fmt,
  hideAlert,
  showAlert,
  skeletons,
  specRows,
  stateValue,
} from "../lib/format.js";
import { t } from "../lib/i18n.js";
import { getOllamaStatus, setOllamaStatus } from "../lib/state.js";
import { setButtonBusy, toast } from "../lib/toast.js";
import { loadModels } from "./models.js";

const ollamaErrorEl = document.getElementById("ollama-error");
const ollamaMetaEl = document.getElementById("ollama-meta");
const refreshStatusBtn = document.getElementById("btn-refresh-status");
const startBtn = document.getElementById("btn-start-ollama");
const stopBtn = document.getElementById("btn-stop-ollama");
const serverStateEl = document.getElementById("server-state");
const serverNoteEl = document.getElementById("server-note");

/**
 * Paint the status cards, spec table and process control bar.
 *
 * @param {object} data Status dict from core.ollama.runtime.get_status.
 */
function renderStatus(data) {
  document.getElementById("ollama-cards").innerHTML = `
    <div class="card">
      <div class="card-label">${escapeHtml(t("ollama.cardInstalled"))}</div>
      ${stateValue(data.installed, t(data.installed ? "value.yes" : "value.no"))}
      <div class="card-sub">${escapeHtml(
        t(data.installed ? "ollama.cardInstalledYes" : "ollama.cardInstalledNo")
      )}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("ollama.cardServer"))}</div>
      ${stateValue(data.running, t(data.running ? "value.running" : "value.stopped"))}
      <div class="card-sub">${escapeHtml(t("ollama.cardServerSub"))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("ollama.cardVersion"))}</div>
      <div class="card-value" dir="ltr">${escapeHtml(fmt(data.version))}</div>
      <div class="card-sub">${escapeHtml(t("ollama.cardVersionSub"))}</div>
    </div>
  `;

  document.getElementById("ollama-specs").innerHTML = specRows([
    [t("ollama.specInstalled"), t(data.installed ? "value.yes" : "value.no")],
    [t("ollama.specServerRunning"), t(data.running ? "value.yes" : "value.no")],
    [t("ollama.specVersion"), data.version],
  ]);

  if (!data.installed) {
    serverStateEl.className = "control-title is-bad";
    serverStateEl.textContent = t("ollama.notInstalled");
    serverNoteEl.textContent = t("ollama.notInstalledNote");
    startBtn.disabled = true;
    stopBtn.disabled = true;
    return;
  }

  serverStateEl.className = `control-title ${data.running ? "is-good" : "is-bad"}`;
  serverStateEl.textContent = t(data.running ? "ollama.serverUp" : "ollama.serverDown");
  serverNoteEl.textContent = t(
    data.running ? "ollama.serverUpNote" : "ollama.serverDownNote"
  );

  startBtn.disabled = data.running;
  stopBtn.disabled = !data.running;
}

/** Repaint the control bar from the last known status. */
function repaintFromState() {
  const status = getOllamaStatus();

  if (status) {
    renderStatus(status);
  }
}

/**
 * Fetch the runtime status and repaint the tab.
 *
 * @param {{quiet?: boolean}} [options] Skip the loading placeholders.
 */
export async function loadOllamaStatus({ quiet = false } = {}) {
  const restore = setButtonBusy(quiet ? null : refreshStatusBtn);

  if (!quiet) {
    document.getElementById("ollama-cards").innerHTML = skeletons(3);
  }

  try {
    const { data } = await api("/api/ollama/status");
    setOllamaStatus(data);
    hideAlert(ollamaErrorEl);
    renderStatus(data);
    ollamaMetaEl.textContent = t("ollama.checkedAt", {
      time: new Date().toLocaleTimeString(),
    });
  } catch (error) {
    setOllamaStatus(null);
    showAlert(ollamaErrorEl, t("ollama.statusFailed", { error: error.message }));
    document.getElementById("ollama-cards").innerHTML = "";
    document.getElementById("ollama-specs").innerHTML = "";
    ollamaMetaEl.textContent = "";
    startBtn.disabled = false;
    stopBtn.disabled = false;
  } finally {
    restore();
  }
}

function bindStart() {
  startBtn.addEventListener("click", async () => {
    await runAction(
      "runtime.start()",
      t("ollama.starting"),
      () => postJson("/api/ollama/start", {}),
      {
        button: startBtn,
        refresh: false,
        onSuccess: (res) => {
          setOllamaStatus(res.data);
          loadModels({ quiet: true });
          return t("ollama.startedBody", {
            version: res.data.version || t("value.unknown"),
          });
        },
      }
    );

    // Restoring a busy button re-enables it, so paint the real state afterwards.
    repaintFromState();
  });
}

function bindStop() {
  stopBtn.addEventListener("click", async () => {
    // Stopping kills the process, which drops any loaded model, so confirm.
    if (!window.confirm(t("ollama.stopConfirm"))) {
      return;
    }

    await runAction(
      "runtime.stop()",
      t("ollama.stopping"),
      () => postJson("/api/ollama/stop", {}),
      {
        button: stopBtn,
        refresh: false,
        onSuccess: (res) => {
          setOllamaStatus(res.data);
          loadModels({ quiet: true });

          // The Ollama desktop app supervises the server and respawns it, so a
          // successful kill can still leave the API reachable.
          return t(res.restarted ? "ollama.respawned" : "ollama.stoppedBody");
        },
      }
    );

    repaintFromState();
  });
}

function bindInstallForm() {
  document.getElementById("form-install").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const path = form.installer_path.value.trim();
    const button = form.querySelector('button[type="submit"]');

    if (!path) {
      toast("error", t("ollama.cannotInstall"), t("ollama.cannotInstallBody"));
      return;
    }

    await runAction(
      "runtime.install()",
      t("ollama.installing"),
      () => postJson("/api/ollama/install", { installer_path: path }),
      {
        button,
        refresh: false,
        onSuccess: (res) => {
          setOllamaStatus(res.data);
          return res.data.installed
            ? t("ollama.installedBody", {
                version: res.data.version || t("value.unknown"),
              })
            : t("ollama.installedNoBinary");
        },
      }
    );

    repaintFromState();
  });
}

/** Bind the Ollama tab controls. */
export function initOllamaPanel() {
  refreshStatusBtn.addEventListener("click", () => loadOllamaStatus());
  bindStart();
  bindStop();
  bindInstallForm();
}
