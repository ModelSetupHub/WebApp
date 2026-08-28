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
      <div class="card-label">Installed</div>
      ${stateValue(data.installed, data.installed ? "yes" : "no")}
      <div class="card-sub">${data.installed ? "binary found on PATH" : "ollama binary not found"}</div>
    </div>
    <div class="card">
      <div class="card-label">Server</div>
      ${stateValue(data.running, data.running ? "running" : "stopped")}
      <div class="card-sub">local API on port 11434</div>
    </div>
    <div class="card">
      <div class="card-label">Version</div>
      <div class="card-value">${escapeHtml(fmt(data.version))}</div>
      <div class="card-sub">reported by the ollama binary</div>
    </div>
  `;

  document.getElementById("ollama-specs").innerHTML = specRows([
    ["Installed", data.installed ? "yes" : "no"],
    ["Server running", data.running ? "yes" : "no"],
    ["Version", data.version],
  ]);

  if (!data.installed) {
    serverStateEl.className = "control-title is-bad";
    serverStateEl.textContent = "Ollama is not installed";
    serverNoteEl.textContent = "Run an installer below before starting the server.";
    startBtn.disabled = true;
    stopBtn.disabled = true;
    return;
  }

  serverStateEl.className = `control-title ${data.running ? "is-good" : "is-bad"}`;
  serverStateEl.textContent = data.running ? "Server is running" : "Server is stopped";
  serverNoteEl.textContent = data.running
    ? "Models can be listed, loaded and run."
    : "Start the server before using any model action.";

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
    ollamaMetaEl.textContent = `Checked ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    setOllamaStatus(null);
    showAlert(ollamaErrorEl, `Could not read Ollama status — ${error.message}`);
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
      "Starting Ollama",
      () => postJson("/api/ollama/start", {}),
      {
        button: startBtn,
        refresh: false,
        onSuccess: (res) => {
          setOllamaStatus(res.data);
          loadModels({ quiet: true });
          return `Server running, version ${res.data.version || "unknown"}.`;
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
    if (!window.confirm("Stop the Ollama server? Any model held in memory will be unloaded.")) {
      return;
    }

    await runAction(
      "runtime.stop()",
      "Stopping Ollama",
      () => postJson("/api/ollama/stop", {}),
      {
        button: stopBtn,
        refresh: false,
        onSuccess: (res) => {
          setOllamaStatus(res.data);
          loadModels({ quiet: true });

          // The Ollama desktop app supervises the server and respawns it, so a
          // successful kill can still leave the API reachable.
          return res.restarted
            ? "The server process was terminated but the Ollama desktop app restarted it. Quit Ollama from the system tray to keep it stopped."
            : "Server stopped.";
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
      toast("error", "Cannot install", "Enter the path to an Ollama installer.");
      return;
    }

    await runAction(
      "runtime.install()",
      "Running installer",
      () => postJson("/api/ollama/install", { installer_path: path }),
      {
        button,
        refresh: false,
        onSuccess: (res) => {
          setOllamaStatus(res.data);
          return res.data.installed
            ? `Ollama installed, version ${res.data.version || "unknown"}.`
            : "The installer finished but no ollama binary was found on PATH yet.";
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
