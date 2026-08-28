// Shared state between the Ollama and Models tabs.
//
// The Models tab needs the runtime status to tell "no models installed" apart
// from "the server is not running", which produce the same empty table. Keeping
// it here lets both panels read it without importing each other.

/** @type {{installed: boolean, running: boolean, version: string|null}|null} */
let ollamaStatus = null;

/** Names from the installed list, used to repopulate the action dropdowns. */
let installedModels = [];

/**
 * Return the last known runtime status, or null if it was never read.
 *
 * @returns {object|null} Status dict.
 */
export function getOllamaStatus() {
  return ollamaStatus;
}

/**
 * Record the runtime status.
 *
 * @param {object|null} status Status dict, or null when unknown.
 */
export function setOllamaStatus(status) {
  ollamaStatus = status;
}

/**
 * Return the installed model names.
 *
 * @returns {string[]} Model names.
 */
export function getInstalledModels() {
  return installedModels;
}

/**
 * Record the installed model names.
 *
 * @param {string[]} names Model names.
 */
export function setInstalledModels(names) {
  installedModels = names;
}
