// System tab controller: load the profile and drive the Rescan button.

import { hideAlert, showAlert, skeletons } from "../lib/format.js";
import { t } from "../lib/i18n.js";
import { setButtonBusy, toast } from "../lib/toast.js";
import {
  renderCpu,
  renderGpu,
  renderMemory,
  renderSoftware,
  renderStorage,
  renderSummary,
} from "./system_render.js";

const PANEL_IDS = [
  "system-cards",
  "software-specs",
  "runtime-specs",
  "cpu-specs",
  "memory-specs",
  "memory-modules",
  "gpu-specs",
  "gpu-devices",
  "storage-drives",
];

const rescanBtn = document.getElementById("btn-rescan");
const scanMetaEl = document.getElementById("scan-meta");
const systemErrorEl = document.getElementById("system-error");
const hostDotEl = document.getElementById("host-dot");
const hostLabelEl = document.getElementById("host-label");

/**
 * Update the sidebar host indicator.
 *
 * @param {"online"|"offline"} state Connection state.
 * @param {string} label Text beside the dot.
 */
function setHostStatus(state, label) {
  hostDotEl.classList.toggle("is-online", state === "online");
  hostDotEl.classList.toggle("is-offline", state === "offline");
  hostLabelEl.textContent = label;
}

function clearPanels() {
  PANEL_IDS.forEach((id) => {
    document.getElementById(id).innerHTML = "";
  });
}

function showError(message) {
  showAlert(systemErrorEl, t("system.scanFailed", { error: message }));
  clearPanels();
  setHostStatus("offline", t("host.scanFailed"));
}

/**
 * Fetch the system profile and repaint the tab.
 *
 * The scan endpoint has its own envelope with a `profile` key rather than
 * `data`, so it is read directly instead of through the shared api helper.
 *
 * @param {{refresh?: boolean}} [options] Force a fresh scan.
 */
export async function loadSystem({ refresh = false } = {}) {
  const restore = setButtonBusy(rescanBtn);
  scanMetaEl.textContent = refresh ? t("system.rescanning") : t("system.scanning");
  document.getElementById("system-cards").innerHTML = skeletons(4);

  try {
    const res = await fetch(`/api/system${refresh ? "?refresh=1" : ""}`);
    const data = await res.json();

    if (!data.ok) {
      scanMetaEl.textContent = "";
      showError(data.error || t("value.unknown"));
      return;
    }

    hideAlert(systemErrorEl);

    const profile = data.profile;
    renderSummary(profile);
    renderSoftware(profile);
    renderCpu(profile);
    renderMemory(profile);
    renderGpu(profile);
    renderStorage(profile);

    scanMetaEl.textContent = t(
      data.cached ? "system.scannedAtCached" : "system.scannedAt",
      { time: data.scanned_at }
    );
    setHostStatus("online", (profile.system || {}).name || t("host.online"));

    if (refresh) {
      toast("success", t("system.rescanned"), t("system.rescannedBody"));
    }
  } catch (error) {
    scanMetaEl.textContent = "";
    showError(error.message);
    toast("error", t("system.rescanned"), error.message);
  } finally {
    restore();
  }
}

/** Bind the System tab controls. */
export function initSystemPanel() {
  rescanBtn.addEventListener("click", () => loadSystem({ refresh: true }));
}
