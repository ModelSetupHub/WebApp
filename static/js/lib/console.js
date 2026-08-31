// The Output panel on the Models tab: the full text result of the last action.

import { escapeHtml } from "./format.js";
import { t } from "./i18n.js";

const consoleEl = document.getElementById("console");

/**
 * Show the settled result of a call.
 *
 * @param {string} call Signature of the core call.
 * @param {*} text Output to display.
 * @param {{isError?: boolean}} [options] Render as a failure.
 */
export function writeConsole(call, text, { isError = false } = {}) {
  const time = new Date().toLocaleTimeString();
  const body = String(text ?? "").trim() || t("console.noOutput");

  consoleEl.innerHTML = `
    <div class="console-head">
      <span class="console-call is-ltr">${escapeHtml(call)}</span>
      <span class="chip ${isError ? "chip-error" : "chip-ready"}">${
        isError ? escapeHtml(t("console.failed")) : escapeHtml(t("console.done"))
      }</span>
      <span class="console-time is-ltr">${escapeHtml(time)}</span>
    </div>
    <pre class="console-body${isError ? " is-error" : " is-success"}">${escapeHtml(body)}</pre>
  `;
  consoleEl.scrollTop = 0;
}

/**
 * Show that a call is in flight.
 *
 * @param {string} call Signature of the core call.
 */
export function writeConsolePending(call) {
  consoleEl.innerHTML = `
    <div class="console-head">
      <span class="console-call is-ltr">${escapeHtml(call)}</span>
      <span class="chip chip-info"><span class="spinner"></span> ${escapeHtml(
        t("console.running")
      )}</span>
    </div>
    <div class="skeleton" style="height:58px"></div>
  `;
}
