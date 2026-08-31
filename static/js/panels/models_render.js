// Renderers for the Models tab: summary cards, the two tables, and the model
// dropdowns shared by the action forms.

import { escapeHtml, fmt, stateValue } from "../lib/format.js";
import { t } from "../lib/i18n.js";
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
    return t("models.emptyNotInstalled");
  }

  if (status && status.running === false) {
    return t("models.emptyServerDown");
  }

  return t("models.emptyNone");
}

/**
 * Build the header and body of a CLI-derived table.
 *
 * Column names and cell values come from the Ollama CLI, so they stay in their
 * original form and read left to right in both languages.
 *
 * @param {object} table Parsed table with columns and rows.
 * @param {Function} actions Receives a row name, returns action button markup.
 * @returns {string} HTML markup for the table.
 */
function dataTable(table, actions) {
  const columns = table.columns || [];
  const headers = columns.map((c) => `<th dir="ltr">${escapeHtml(c)}</th>`).join("");

  const body = (table.rows || [])
    .map((row) => {
      const cells = columns
        .map((col, index) => {
          const cls = index === 0 ? ' class="cell-name"' : "";
          return `<td${cls} dir="ltr">${escapeHtml(fmt(row[col]))}</td>`;
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
      <button type="button" class="btn btn-sm" data-act="info" data-model="${model}">${escapeHtml(t("btn.info"))}</button>
      <button type="button" class="btn btn-sm" data-act="load" data-model="${model}">${escapeHtml(t("btn.load"))}</button>
      <button type="button" class="btn btn-sm" data-act="stop" data-model="${model}">${escapeHtml(t("btn.stop"))}</button>
      <button type="button" class="btn btn-sm btn-danger" data-act="remove" data-model="${model}">${escapeHtml(t("btn.remove"))}</button>`;
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
    el.innerHTML = `<div class="empty-state">${escapeHtml(t("models.emptyNoneLoaded"))}</div>`;
    return;
  }

  el.innerHTML = dataTable(
    table,
    (name) =>
      `<button type="button" class="btn btn-sm btn-danger" data-act="stop" data-model="${escapeHtml(
        name
      )}">${escapeHtml(t("btn.stop"))}</button>`
  );
}

/** Refill every model dropdown, keeping the current choice when still valid. */
export function syncModelSelects() {
  const models = getInstalledModels();

  document.querySelectorAll("[data-model-select]").forEach((select) => {
    const previous = select.value;

    if (models.length === 0) {
      select.innerHTML = `<option value="">${escapeHtml(t("models.noModelsInSelect"))}</option>`;
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
      <div class="card-label">${escapeHtml(t("models.cardInstalled"))}</div>
      <div class="card-value" dir="ltr">${installed}</div>
      <div class="card-sub">${escapeHtml(t("models.cardInstalledSub"))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("models.cardLoaded"))}</div>
      <div class="card-value ${running > 0 ? "is-good" : ""}" dir="ltr">${running}</div>
      <div class="card-sub">${escapeHtml(t("models.cardLoadedSub"))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("models.cardServer"))}</div>
      ${
        serverUp === null
          ? '<div class="card-value is-unknown">—</div>'
          : stateValue(serverUp, t(serverUp ? "value.running" : "value.stopped"))
      }
      <div class="card-sub" dir="ltr">${
        status ? escapeHtml(fmt(status.version, " · ollama")) : escapeHtml(t("value.statusUnknown"))
      }</div>
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
