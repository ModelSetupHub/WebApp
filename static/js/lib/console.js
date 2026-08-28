// The Output panel on the Models tab: the full text result of the last action.

import { escapeHtml } from "./format.js";

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
  const body = String(text ?? "").trim() || "(no output)";

  consoleEl.innerHTML = `
    <div class="console-head">
      <span class="console-call">${escapeHtml(call)}</span>
      <span class="chip ${isError ? "chip-error" : "chip-ready"}">${isError ? "failed" : "done"}</span>
      <span class="console-time">${escapeHtml(time)}</span>
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
      <span class="console-call">${escapeHtml(call)}</span>
      <span class="chip chip-info"><span class="spinner"></span> running</span>
    </div>
    <div class="skeleton" style="height:58px"></div>
  `;
}
