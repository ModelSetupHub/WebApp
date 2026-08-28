// Model Setup Hub — dashboard entrypoint.
//
// Binds every panel, then loads their data. Panels live in ./panels and share
// helpers from ./lib.

import { setRefreshHook } from "./lib/actions.js";
import { initNav } from "./lib/nav.js";
import { initBenchmarkPanel, refreshBenchmarkPanel } from "./panels/benchmark.js";
import { initModelsPanel, loadModels } from "./panels/models.js";
import { initOllamaPanel, loadOllamaStatus } from "./panels/ollama.js";
import { initSystemPanel, loadSystem } from "./panels/system.js";

initNav();
initSystemPanel();
initOllamaPanel();
initModelsPanel();
initBenchmarkPanel();

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
