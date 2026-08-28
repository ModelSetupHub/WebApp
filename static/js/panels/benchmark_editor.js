// The manual configuration editor: build the option fields from the schema the
// server publishes, then read a configuration back out of them.
//
// Every option has three states, not two — set to a value, or not set at all —
// so a blank field means "leave the model's default alone" and is never sent.
// Booleans therefore render as a three-way select rather than a checkbox.

import { escapeHtml } from "../lib/format.js";

// Sampling is what most comparisons vary, so it is the one group open on load.
const OPEN_BY_DEFAULT = "Sampling";

const groupsEl = document.getElementById("bench-editor-groups");
const nameEl = document.getElementById("bench-editor-name-input");
const countEl = document.getElementById("bench-editor-count");

let schema = [];

/**
 * Render one option's input.
 *
 * @param {object} option Schema entry.
 * @returns {string} HTML markup.
 */
function optionField(option) {
  const key = escapeHtml(option.key);
  const hint = option.hint ? `<span class="field-hint">${escapeHtml(option.hint)}</span>` : "";

  let control;

  if (option.type === "bool") {
    control = `
      <select class="input" data-option="${key}">
        <option value="">not set</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>`;
  } else if (option.type === "list") {
    control = `<input class="input" data-option="${key}" autocomplete="off" spellcheck="false"
      placeholder="${escapeHtml(option.placeholder || "")}">`;
  } else {
    const bounds = [
      option.min !== undefined ? `min="${escapeHtml(option.min)}"` : "",
      option.max !== undefined ? `max="${escapeHtml(option.max)}"` : "",
      option.step !== undefined ? `step="${escapeHtml(option.step)}"` : "",
    ]
      .filter(Boolean)
      .join(" ");

    control = `<input class="input" type="number" data-option="${key}" ${bounds}
      placeholder="${escapeHtml(option.placeholder || "")}">`;
  }

  return `
    <label class="bench-option field" data-option-field="${key}">
      <span class="field-label">${escapeHtml(option.label || option.key)}</span>
      ${control}
      ${hint}
    </label>`;
}

/**
 * Build the collapsible option groups from the schema.
 *
 * @param {Array<object>} options Schema entries.
 */
export function buildEditor(options) {
  schema = options;

  const groups = [];

  options.forEach((option) => {
    const title = option.group || "Options";
    let group = groups.find((entry) => entry.title === title);

    if (!group) {
      group = { title, options: [] };
      groups.push(group);
    }

    group.options.push(option);
  });

  groupsEl.innerHTML = groups
    .map((group) => {
      const open = group.title === OPEN_BY_DEFAULT ? " is-open" : "";
      return `
        <section class="bench-group${open}" data-group="${escapeHtml(group.title)}">
          <button type="button" class="bench-group-head" aria-expanded="${open ? "true" : "false"}">
            <span class="bench-group-caret" aria-hidden="true">▶</span>
            ${escapeHtml(group.title)}
            <span class="bench-group-badge is-empty">0 set</span>
          </button>
          <div class="bench-group-body">
            ${group.options.map(optionField).join("")}
          </div>
        </section>`;
    })
    .join("");

  groupsEl.querySelectorAll(".bench-group-head").forEach((head) => {
    head.addEventListener("click", () => {
      const group = head.closest(".bench-group");
      const open = group.classList.toggle("is-open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  // A field that has a value is marked as it is typed, and the per-group counts
  // update with it, so a collapsed group still reports what it holds.
  groupsEl.addEventListener("input", markFilled);
  groupsEl.addEventListener("change", markFilled);

  markFilled();
}

/** Tint the fields that hold a value and refresh the counters. */
function markFilled() {
  let total = 0;

  groupsEl.querySelectorAll(".bench-group").forEach((group) => {
    let set = 0;

    group.querySelectorAll("[data-option]").forEach((input) => {
      const filled = input.value.trim() !== "";
      input.closest(".bench-option").classList.toggle("is-set", filled);

      if (filled) {
        set += 1;
      }
    });

    const badge = group.querySelector(".bench-group-badge");
    badge.textContent = `${set} set`;
    badge.classList.toggle("is-empty", set === 0);
    total += set;
  });

  countEl.textContent =
    total === 0 ? "No options set — this configuration would run model defaults." : `${total} option${total === 1 ? "" : "s"} set`;
}

/** Empty every field in the editor. */
export function resetEditor() {
  nameEl.value = "";
  groupsEl.querySelectorAll("[data-option]").forEach((input) => {
    input.value = "";
  });
  markFilled();
}

/**
 * Fill the editor from an existing configuration.
 *
 * An option the schema does not list cannot be shown in a field, so it is kept
 * aside and merged back in on save rather than silently dropped.
 *
 * @param {{name: string, options: object}} config Configuration to edit.
 * @returns {object} Options that had no field to go in.
 */
export function fillEditor(config) {
  resetEditor();
  nameEl.value = config.name || "";

  const extras = {};

  Object.entries(config.options || {}).forEach(([key, value]) => {
    const input = groupsEl.querySelector(`[data-option="${CSS.escape(key)}"]`);

    if (!input) {
      extras[key] = value;
      return;
    }

    input.value = Array.isArray(value) ? value.join(", ") : String(value);

    // Reveal the group holding a set option, so editing does not start with the
    // values hidden behind a collapsed header.
    const group = input.closest(".bench-group");
    group.classList.add("is-open");
    group.querySelector(".bench-group-head").setAttribute("aria-expanded", "true");
  });

  markFilled();
  return extras;
}

/**
 * Read the editor into a configuration.
 *
 * Values are left as the strings the fields hold; the server coerces them using
 * the same schema it published, so the browser never has to guess a type.
 *
 * @param {object} [extras] Options preserved from an edited configuration.
 * @returns {{name: string, options: object}} The configuration.
 */
export function readEditor(extras = {}) {
  const options = { ...extras };

  schema.forEach((option) => {
    const input = groupsEl.querySelector(`[data-option="${CSS.escape(option.key)}"]`);
    const value = input ? input.value.trim() : "";

    if (value === "") {
      return;
    }

    options[option.key] = value;
  });

  return { name: nameEl.value.trim(), options };
}

/** Move focus to the name field when the editor opens. */
export function focusEditor() {
  nameEl.focus();
}
