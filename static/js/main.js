// Model Setup Hub — dashboard entrypoint.
//
// Language first: the document direction and every static string are applied
// before any panel is bound, so nothing renders in one language and then flips.
// Panels live in ./panels and share helpers from ./lib.

import { setRefreshHook } from "./lib/actions.js";
import { applyDocumentLang, applyStaticStrings, getLang, setLang } from "./lib/i18n.js";
import { initNav } from "./lib/nav.js";
import { initSidebar } from "./lib/sidebar.js";
import { initBenchmarkPanel, refreshBenchmarkPanel } from "./panels/benchmark.js";
import { initHistoryPanel } from "./panels/benchmark_history.js";
import { initModelComparePanel } from "./panels/benchmark_model_compare.js";
import { initModelsPanel, loadModels } from "./panels/models.js";
import { initOllamaPanel, loadOllamaStatus } from "./panels/ollama.js";
import { initSystemPanel, loadSystem } from "./panels/system.js";

/** Mark the active language button and bind the switch. */
function initLangSwitch() {
  const current = getLang();

  document.querySelectorAll(".lang-btn").forEach((button) => {
    const lang = button.dataset.lang;
    button.classList.toggle("is-active", lang === current);
    button.setAttribute("aria-pressed", lang === current ? "true" : "false");
    button.addEventListener("click", () => setLang(lang));
  });
}

applyDocumentLang();
applyStaticStrings();
initLangSwitch();
initSidebar();

initNav();
initSystemPanel();
initOllamaPanel();
initModelsPanel();
initBenchmarkPanel();
initModelComparePanel();
initHistoryPanel();

// Any action that changes model state reloads the model tables. The benchmark
// tab reads the same model list and server status, so it repaints with them.
setRefreshHook(async () => {
  await loadModels({ quiet: true });
  refreshBenchmarkPanel();
});

loadSystem();
// Status first, so the models tables can explain an empty list.
loadOllamaStatus()
  .then(() => loadModels())
  .then(() => refreshBenchmarkPanel());
