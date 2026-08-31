// Renderers for the Benchmark tab's builder: the summary cards, the option
// editor, the import preview and the configuration cards.

import { escapeHtml } from "../lib/format.js";
import { t } from "../lib/i18n.js";
import { getConfigurations, seriesColor } from "./benchmark_store.js";

/**
 * Render one option's value as it appears on a configuration card.
 *
 * Option names are Ollama's own identifiers and values are numbers, so the chip
 * reads left to right whatever the interface language is.
 *
 * @param {string} key Option name.
 * @param {*} value Option value.
 * @returns {string} HTML markup.
 */
function optionChip(key, value) {
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return `<span class="bench-option-chip" dir="ltr" title="${escapeHtml(`${key} = ${text}`)}">
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
    return `<span class="bench-option-chip">${escapeHtml(t("bench.modelDefaults"))}</span>`;
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
    el.innerHTML = `<div class="empty-state">${escapeHtml(t("bench.emptyConfigList"))}</div>`;
    return;
  }

  el.innerHTML = configurations
    .map((config, index) => {
      const color = seriesColor(index);
      return `
        <article class="bench-config" style="--series-color:${color}">
          <div class="bench-config-head">
            <span class="bench-config-index" dir="ltr">${String(index + 1).padStart(2, "0")}</span>
            <span class="bench-config-name" dir="ltr" title="${escapeHtml(config.name)}">${escapeHtml(config.name)}</span>
          </div>
          <div class="bench-config-options">${optionChips(config.options)}</div>
          <div class="bench-config-foot">
            <button type="button" class="btn btn-sm" data-config-act="edit" data-config-id="${config.id}">${escapeHtml(t("btn.edit"))}</button>
            <button type="button" class="btn btn-sm" data-config-act="copy" data-config-id="${config.id}">${escapeHtml(t("btn.duplicate"))}</button>
            <button type="button" class="btn btn-sm btn-danger" data-config-act="remove" data-config-id="${config.id}">${escapeHtml(t("btn.remove"))}</button>
          </div>
        </article>`;
    })
    .join("");
}
