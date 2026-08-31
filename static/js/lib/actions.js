// One place where a core call becomes visible progress: the output panel, a
// toast, and a busy state on the button that triggered it.

import { writeConsole, writeConsolePending } from "./console.js";
import { t } from "./i18n.js";
import { setButtonBusy, toast } from "./toast.js";

// Panels register a reload here rather than being imported directly, which
// would make this module and the models panel depend on each other.
let refreshHook = async () => {};

/**
 * Register the callback used when an action asks for a data refresh.
 *
 * @param {Function} hook Async reload function.
 */
export function setRefreshHook(hook) {
  refreshHook = hook;
}

/**
 * Run one core call and report it everywhere the user is looking.
 *
 * @param {string} call Signature shown in the output panel.
 * @param {string} label Short human-readable action name for the toast.
 * @param {Function} work Async function performing the request.
 * @param {object} [options] onSuccess formats the output text; refresh triggers
 *     the registered reload; button is put into a busy state for the duration.
 * @returns {Promise<boolean>} Whether the call succeeded.
 */
export async function runAction(call, label, work, { onSuccess, refresh = true, button } = {}) {
  writeConsolePending(call);
  const restoreButton = setButtonBusy(button);
  const pending = toast("pending", t("action.pending", { label }), t("action.pendingBody"));

  try {
    const result = await work();
    const message = onSuccess ? onSuccess(result) : result.data;

    writeConsole(call, message);
    pending.settle(
      "success",
      t("action.done", { label }),
      String(message ?? "").trim().slice(0, 200)
    );

    if (refresh) {
      await refreshHook();
    }

    return true;
  } catch (error) {
    writeConsole(call, error.message, { isError: true });
    pending.settle("error", t("action.failed", { label }), error.message);
    return false;
  } finally {
    restoreButton();
  }
}
