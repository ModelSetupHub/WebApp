// The sidebar rail: a floating island, collapsible to an icon strip.

import { t } from "./i18n.js";

const STORAGE_KEY = "msh-sidebar-collapsed";

const toggle = document.getElementById("btn-sidebar-toggle");

/**
 * Read the stored collapsed state, defaulting to expanded.
 *
 * @returns {boolean} Whether the rail should start collapsed.
 */
function storedCollapsed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Apply or remove the collapsed state.
 *
 * The state lives on the body so both the shell's grid track and everything
 * inside the rail can key off one class. The aria-expanded flag describes the
 * toggle's own target — an expanded rail — so it reads the opposite of the body
 * class, and that asymmetry is intentional.
 *
 * @param {boolean} collapsed Whether the rail is collapsed.
 */
function apply(collapsed) {
  document.body.classList.toggle("sidebar-is-collapsed", collapsed);
  toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");

  const label = t(collapsed ? "sidebar.expand" : "sidebar.collapse");
  toggle.setAttribute("aria-label", label);
  toggle.setAttribute("title", label);

  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Nothing to do: without storage the choice just does not outlive the
    // session, which is how the language switch degrades too.
  }
}

/** Bind the collapse toggle and restore the remembered state. */
export function initSidebar() {
  apply(storedCollapsed());

  toggle.addEventListener("click", () => {
    apply(!document.body.classList.contains("sidebar-is-collapsed"));
  });
}
