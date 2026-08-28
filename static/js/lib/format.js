// Small formatting and HTML-building helpers shared by every panel.

/**
 * Format a value for display, mapping empty and unknown values to an em dash.
 *
 * The core scanner returns the literal string "Unknown" where detection is not
 * possible, so it is treated the same as null.
 *
 * @param {*} value Value to display.
 * @param {string} [unit] Suffix appended to a present value.
 * @returns {string} Display text.
 */
export function fmt(value, unit = "") {
  if (value === null || value === undefined || value === "" || value === "Unknown") {
    return "—";
  }
  return value + unit;
}

/**
 * Escape a value for interpolation into an HTML string.
 *
 * Hardware names and part numbers come straight from WMI, so nothing reaches
 * the DOM without passing through here.
 *
 * @param {*} value Value to escape.
 * @returns {string} Escaped text.
 */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

/**
 * Build key/value rows for a spec table.
 *
 * @param {Array<[string, *]>} rows Label and value pairs.
 * @returns {string} HTML markup.
 */
export function specRows(rows) {
  return rows
    .map(([label, value]) => {
      const text = fmt(value);
      const unknown = text === "—" ? " is-unknown" : "";
      return `
        <div class="spec-row">
          <span class="spec-key">${escapeHtml(label)}</span>
          <span class="spec-val${unknown}">${escapeHtml(text)}</span>
        </div>`;
    })
    .join("");
}

/**
 * Build spec rows wrapped in a grid.
 *
 * Tile bodies re-flow their pairs into columns as the tile widens, so a lone
 * module or drive does not become a tall column of long, empty rows.
 *
 * @param {Array<[string, *]>} rows Label and value pairs.
 * @returns {string} HTML markup.
 */
export function specGrid(rows) {
  return `<div class="spec-grid">${specRows(rows)}</div>`;
}

/**
 * Build a usage bar, colour-coded by how full it is.
 *
 * @param {number} percent Fill percentage, clamped to 0-100.
 * @returns {string} HTML markup.
 */
export function usageBar(percent) {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  const level = value >= 85 ? "is-high" : value >= 60 ? "is-mid" : "";
  return `<div class="bar"><div class="bar-fill ${level}" style="width:${value}%"></div></div>`;
}

/**
 * Build placeholder blocks shown while data loads.
 *
 * @param {number} count How many placeholders to render.
 * @returns {string} HTML markup.
 */
export function skeletons(count) {
  return Array.from({ length: count }, () => `<div class="skeleton"></div>`).join("");
}

/**
 * Colour a card value by boolean health so state reads at a glance.
 *
 * @param {boolean} isGood Whether the state is healthy.
 * @param {string} label Text to show.
 * @returns {string} HTML markup.
 */
export function stateValue(isGood, label) {
  const tone = isGood ? "is-good" : "is-bad";
  return `<div class="card-value ${tone}">${escapeHtml(label)}</div>`;
}

/**
 * Show an inline alert bar.
 *
 * @param {HTMLElement} el Alert element.
 * @param {string} message Text to show.
 */
export function showAlert(el, message) {
  el.textContent = message;
  el.classList.remove("is-hidden");
}

/**
 * Hide an inline alert bar.
 *
 * @param {HTMLElement} el Alert element.
 */
export function hideAlert(el) {
  el.classList.add("is-hidden");
}
