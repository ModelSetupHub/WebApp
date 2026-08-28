// Corner notifications reporting the progress of an action.

const toastStack = document.getElementById("toast-stack");

const TOAST_ICON = {
  pending: '<span class="spinner"></span>',
  success: "✓",
  error: "✕",
};

/**
 * Show a toast.
 *
 * @param {"pending"|"success"|"error"} state Visual tone.
 * @param {string} title Headline text.
 * @param {string} [body] Optional detail text.
 * @param {{timeout?: number}} [options] Auto-dismiss delay in ms.
 * @returns {{settle: Function, dismiss: Function}} Handle for a pending toast.
 */
export function toast(state, title, body = "", { timeout = 4500 } = {}) {
  const el = document.createElement("div");
  el.className = `toast is-${state}`;
  el.innerHTML = `
    <span class="toast-icon">${TOAST_ICON[state] || ""}</span>
    <span class="toast-text">
      <span class="toast-title"></span>
      ${body ? '<span class="toast-body"></span>' : ""}
    </span>`;

  el.querySelector(".toast-title").textContent = title;

  if (body) {
    el.querySelector(".toast-body").textContent = body;
  }

  toastStack.appendChild(el);

  const dismiss = () => {
    if (!el.isConnected) {
      return;
    }
    el.classList.add("is-leaving");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  };

  // A pending toast has no timeout; it stays until its action settles.
  const timer = state === "pending" ? null : window.setTimeout(dismiss, timeout);

  el.addEventListener("click", dismiss);

  return {
    settle(nextState, nextTitle, nextBody) {
      window.clearTimeout(timer);
      dismiss();
      return toast(nextState, nextTitle, nextBody);
    },
    dismiss,
  };
}

/**
 * Put a button into a busy state.
 *
 * The label is kept so a table row does not reflow while the action runs.
 *
 * @param {HTMLButtonElement|null} button Button to mark busy, or null for none.
 * @returns {Function} Call to restore the button.
 */
export function setButtonBusy(button) {
  if (!button) {
    return () => {};
  }

  const label = button.innerHTML;
  button.disabled = true;
  button.classList.add("is-busy");
  button.innerHTML = `<span class="spinner"></span>${label}`;

  return () => {
    button.disabled = false;
    button.classList.remove("is-busy");
    button.innerHTML = label;
  };
}
