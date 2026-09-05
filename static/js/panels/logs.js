// Logs tab controller: read the toolkit's execution log through the server,
// filter it by level/component/action, and keep the file-level actions — open
// in the OS viewer, download, reset — one click away.
//
// Everything the page shows comes from /api/logs, whose parsing and filtering
// are Core's own; this panel only carries the query across and paints what
// returns.

import { api, postJson } from "../lib/api.js";
import { escapeHtml, hideAlert, showAlert } from "../lib/format.js";
import { t } from "../lib/i18n.js";
import { setButtonBusy, toast } from "../lib/toast.js";

const errorEl = document.getElementById("logs-error");
const metaEl = document.getElementById("logs-meta");
const tableEl = document.getElementById("logs-table-wrap");
const levelEl = document.getElementById("logs-filter-level");
const componentEl = document.getElementById("logs-filter-component");
const actionEl = document.getElementById("logs-filter-action");
const limitEl = document.getElementById("logs-filter-limit");

// The component/action dropdowns fill from the entries themselves: the log's
// own vocabulary, so the filters always match reality.
let knownComponents = [];
let knownActions = [];

/**
 * Fetch and render the entries under the current filters.
 *
 * @param {boolean} [keepFilters] Whether the response should also refresh the
 *     component/action dropdowns from the returned entries. Off when a
 *     filter change itself triggered the load — rebuilding those mid-choice
 *     would yank the open dropdown away.
 */
async function loadLogs(keepFilters = true) {
  const params = new URLSearchParams();

  if (levelEl.value) params.set("level", levelEl.value);
  if (componentEl.value) params.set("component", componentEl.value);
  if (actionEl.value) params.set("action", actionEl.value);
  if (limitEl.value) params.set("limit", limitEl.value);

  try {
    const { data } = await api(`/api/logs?${params.toString()}`);

    hideAlert(errorEl);
    render(data.entries);
    renderFileMeta(data.file);
    if (keepFilters) {
      fillFilterOptions(data.entries);
    }
  } catch (error) {
    showAlert(errorEl, t("logs.loadFailed", { error: error.message }));
  }
}

/** Paint one entry as a table row; the message carries the page's direction. */
function render(entries) {
  if (entries.length === 0) {
    tableEl.innerHTML = `<div class="empty-state">${escapeHtml(
      t("logs.noEntries")
    )}</div>`;
    return;
  }

  const rows = entries
    .map((entry) => {
      const tone =
        entry.level === "ERROR"
          ? "is-error"
          : entry.level === "WARNING"
            ? "is-warning"
            : "";

      const details = entry.details
        ? `<div class="logs-row-details" dir="ltr">${escapeHtml(
            JSON.stringify(entry.details)
          )}</div>`
        : "";

      return `
        <tr class="logs-row ${tone}">
          <td class="logs-cell-time is-ltr" dir="ltr">${escapeHtml(entry.timestamp)}</td>
          <td class="logs-cell-level"><span class="logs-level logs-level-${escapeHtml(
            entry.level
          )}">${escapeHtml(entry.level)}</span></td>
          <td class="logs-cell-component is-ltr" dir="ltr" title="${escapeHtml(entry.component)}">${escapeHtml(
            entry.component
          )}</td>
          <td class="logs-cell-action is-ltr" dir="ltr" title="${escapeHtml(entry.action)}">${escapeHtml(
            entry.action
          )}</td>
          <td class="logs-cell-message">
            <span class="logs-message">${escapeHtml(entry.message)}</span>
            ${details}
          </td>
        </tr>`;
    })
    .join("");

  tableEl.innerHTML = `
    <div class="table-wrap logs-wrap">
      <table class="data-table logs-table">
        <thead>
          <tr>
            <th class="logs-cell-time">${escapeHtml(t("logs.colTime"))}</th>
            <th>${escapeHtml(t("logs.colLevel"))}</th>
            <th>${escapeHtml(t("logs.colComponent"))}</th>
            <th>${escapeHtml(t("logs.colAction"))}</th>
            <th>${escapeHtml(t("logs.colMessage"))}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/** Show the file's size and line count beside the refresh button. */
function renderFileMeta(file) {
  const kb = (file.size_bytes / 1024).toFixed(1);

  metaEl.textContent = t("logs.fileMeta", {
    lines: file.line_count,
    kb,
  });
}

/**
 * Fill the component/action dropdowns from the entries just returned.
 *
 * @param {Array<object>} entries The entries currently displayed.
 */
function fillFilterOptions(entries) {
  knownComponents = [
    ...new Set(entries.map((entry) => entry.component).filter(Boolean)),
  ].sort();
  knownActions = [
    ...new Set(entries.map((entry) => entry.action).filter(Boolean)),
  ].sort();

  rebuildSelect(componentEl, knownComponents);
  rebuildSelect(actionEl, knownActions);
}

/**
 * Replace a filter's options, keeping the current selection when it survives.
 *
 * @param {HTMLSelectElement} select The dropdown to rebuild.
 * @param {string[]} values The values it should offer.
 */
function rebuildSelect(select, values) {
  const current = select.value;

  select.innerHTML =
    `<option value="">${escapeHtml(t("logs.filterAll"))}</option>` +
    values
      .map(
        (value) =>
          `<option value="${escapeHtml(value)}" ${
            value === current ? "selected" : ""
          } dir="ltr">${escapeHtml(value)}</option>`
      )
      .join("");
}

/** Ask the server to truncate the log, after the usual confirmation. */
async function resetLog() {
  if (!window.confirm(t("logs.resetConfirm"))) {
    return;
  }

  const button = document.getElementById("btn-logs-reset");
  const restore = setButtonBusy(button);

  try {
    const { data } = await postJson("/api/logs/reset", {});

    toast(
      "success",
      t("logs.resetDone"),
      t("logs.resetDoneBody", { lines: data.previous_line_count })
    );
    await loadLogs();
  } catch (error) {
    toast("error", t("logs.resetFailed"), error.message);
  } finally {
    restore();
  }
}

/** Ask the OS to open the raw log file in its default viewer. */
async function openFile() {
  const button = document.getElementById("btn-logs-open");
  const restore = setButtonBusy(button);

  try {
    const { data } = await api("/api/logs/open");
    toast("success", t("logs.opened"), data.path);
  } catch (error) {
    toast("error", t("logs.openFailed"), error.message);
  } finally {
    restore();
  }
}

/** Download the raw log file as an attachment. */
async function downloadFile() {
  const button = document.getElementById("btn-logs-download");
  const restore = setButtonBusy(button);

  try {
    const response = await fetch("/api/logs/download");

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Request failed (${response.status})`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "executions.log";
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast("error", t("logs.downloadFailed"), error.message);
  } finally {
    restore();
  }
}

/** Bind the Logs tab and load the first page. */
export function initLogsPanel() {
  [levelEl, componentEl, actionEl, limitEl].forEach((el) => {
    el.addEventListener("change", () => loadLogs(false));
  });

  document.getElementById("btn-logs-refresh").addEventListener("click", () => loadLogs());
  document.getElementById("btn-logs-reset").addEventListener("click", resetLog);
  document.getElementById("btn-logs-open").addEventListener("click", openFile);
  document.getElementById("btn-logs-download").addEventListener("click", downloadFile);

  loadLogs();
}
