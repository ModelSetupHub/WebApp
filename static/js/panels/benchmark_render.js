// Renderers for the Benchmark tab's builder: the summary cards, the option
// editor, the import preview and the configuration cards.

import { escapeHtml } from "../lib/format.js";
import { getConfigurations, seriesColor } from "./benchmark_store.js";

/**
 * Render one option's value as it appears on a configuration card.
 *
 * @param {string} key Option name.
 * @param {*} value Option value.
 * @returns {string} HTML markup.
 */
function optionChip(key, value) {
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return `<span class="bench-option-chip" title="${escapeHtml(`${key} = ${text}`)}">
    <b>${escapeHtml(key)}</b> ${escapeHtml(text)}</span>`;
}

/**
 * Render every option of one configuration as chips.
 *
 * @param {object} options Ollama options.
 * @returns {string} HTML markup.
 */
export function optionChips(options) {
  const entries = Object.entries(options || {});

  if (entries.length === 0) {
    return `<span class="bench-option-chip">model defaults</span>`;
  }

  return entries.map(([key, value]) => optionChip(key, value)).join("");
}

/**
 * Paint the configuration cards.
 *
 * @param {HTMLElement} el Container element.
 */
export function renderConfigList(el) {
  const configurations = getConfigurations();

  if (configurations.length === 0) {
    el.innerHTML = `<div class="empty-state">
      No configurations yet. Add one by hand, or upload a configuration file.
    </div>`;
    return;
  }

  el.innerHTML = configurations
    .map((config, index) => {
      const color = seriesColor(index);
      return `
        <article class="bench-config" style="--series-color:${color}">
          <div class="bench-config-head">
            <span class="bench-config-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="bench-config-name" title="${escapeHtml(config.name)}">${escapeHtml(config.name)}</span>
          </div>
          <div class="bench-config-options">${optionChips(config.options)}</div>
          <div class="bench-config-foot">
            <button type="button" class="btn btn-sm" data-config-act="edit" data-config-id="${config.id}">Edit</button>
            <button type="button" class="btn btn-sm" data-config-act="copy" data-config-id="${config.id}">Duplicate</button>
            <button type="button" class="btn btn-sm btn-danger" data-config-act="remove" data-config-id="${config.id}">Remove</button>
          </div>
        </article>`;
    })
    .join("");
}
