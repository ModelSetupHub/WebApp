// Renderers for the Models tab: summary cards, the two tables, and the model
// dropdowns shared by the action forms.

import { escapeHtml, fmt, stateValue } from "../lib/format.js";
import { getInstalledModels, getOllamaStatus } from "../lib/state.js";

/**
 * Explain an empty installed-models table.
 *
 * A missing binary, a stopped server and a genuinely empty library all produce
 * the same empty table, so the runtime status decides the wording.
 *
 * @returns {string} Message for the empty state.
 */
function emptyTableNote() {
  const status = getOllamaStatus();

  if (status && status.installed === false) {
    return "Ollama is not installed, so no models can be listed.";
  }

  if (status && status.running === false) {
    return "The Ollama server is not running.";
  }

  return "No models installed.";
}

/**
 * Build the header and body of a CLI-derived table.
 *
 * @param {object} table Parsed table with columns and rows.
 * @param {Function} actions Receives a row name, returns action button markup.
 * @returns {string} HTML markup for the table.
 */
function dataTable(table, actions) {
  const columns = table.columns || [];
  const headers = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");

  const body = (table.rows || [])
    .map((row) => {
      const cells = columns
        .map((col, index) => {
          const cls = index === 0 ? ' class="cell-name"' : "";
          return `<td${cls}>${escapeHtml(fmt(row[col]))}</td>`;
        })
        .join("");

      return `
        <tr>
          ${cells}
          <td class="cell-actions">
            <div class="btn-row">${actions(row.name || "")}</div>
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${headers}<th></th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

/**
 * Paint the installed models table with its per-row actions.
 *
 * @param {object} table Parsed output of list_models.
 */
export function renderModelsTable(table) {
  const el = document.getElementById("models-table");

  if ((table.rows || []).length === 0) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(emptyTableNote())}</div>`;
    return;
  }

  el.innerHTML = dataTable(table, (name) => {
    const model = escapeHtml(name);
    return `
      <button type="button" class="btn btn-sm" data-act="info" data-model="${model}">Info</button>
      <button type="button" class="btn btn-sm" data-act="load" data-model="${model}">Load</button>
      <button type="button" class="btn btn-sm" data-act="stop" data-model="${model}">Stop</button>
      <button type="button" class="btn btn-sm btn-danger" data-act="remove" data-model="${model}">Remove</button>`;
  });
}

/**
 * Paint the running models table.
 *
 * @param {object} table Parsed output of list_running_models.
 */
export function renderRunningTable(table) {
  const el = document.getElementById("running-table");

  if ((table.rows || []).length === 0) {
    el.innerHTML = `<div class="empty-state">No model is currently loaded in memory.</div>`;
    return;
  }

  el.innerHTML = dataTable(
    table,
    (name) =>
      `<button type="button" class="btn btn-sm btn-danger" data-act="stop" data-model="${escapeHtml(name)}">Stop</button>`
  );
}

/** Refill every model dropdown, keeping the current choice when still valid. */
export function syncModelSelects() {
  const models = getInstalledModels();

  document.querySelectorAll("[data-model-select]").forEach((select) => {
    const previous = select.value;

    if (models.length === 0) {
      select.innerHTML = `<option value="">no models installed</option>`;
      select.disabled = true;
      return;
    }

    select.disabled = false;
    select.innerHTML = models
      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join("");

    if (models.includes(previous)) {
      select.value = previous;
    }
  });
}

/**
 * Paint the three summary cards.
 *
 * @param {number} installed Count of installed models.
 * @param {number} running Count of models resident in memory.
 */
export function renderModelsCards(installed, running) {
  const status = getOllamaStatus();
  const serverUp = status ? status.running : null;

  document.getElementById("models-cards").innerHTML = `
    <div class="card">
      <div class="card-label">Installed</div>
      <div class="card-value">${installed}</div>
      <div class="card-sub">models on disk</div>
    </div>
    <div class="card">
      <div class="card-label">Loaded</div>
      <div class="card-value ${running > 0 ? "is-good" : ""}">${running}</div>
      <div class="card-sub">models resident in memory</div>
    </div>
    <div class="card">
      <div class="card-label">Server</div>
      ${serverUp === null
        ? '<div class="card-value is-unknown">—</div>'
        : stateValue(serverUp, serverUp ? "running" : "stopped")}
      <div class="card-sub">${status ? escapeHtml(fmt(status.version, " · ollama")) : "status unknown"}</div>
    </div>
  `;
}

/**
 * Render the sections returned by show_model_info as plain text.
 *
 * @param {object} data Parsed output of show_model_info.
 * @returns {string} Text for the output panel.
 */
export function formatModelInfo(data) {
  if (!data.sections || data.sections.length === 0) {
    return data.raw || "";
  }

  return data.sections
    .map((section) => {
      const rows = section.rows
        .map(([key, value]) => `  ${key.padEnd(20)}${value}`)
        .join("\n");
      return `${section.title}\n${rows}`;
    })
    .join("\n\n");
}
