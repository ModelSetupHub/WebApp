// Model Setup Hub — dashboard entrypoint.
//
// Binds every panel, then loads their data. Panels live in ./panels and share
// helpers from ./lib.

import { setRefreshHook } from "./lib/actions.js";
import { initNav } from "./lib/nav.js";
import { initModelsPanel, loadModels } from "./panels/models.js";
import { initOllamaPanel, loadOllamaStatus } from "./panels/ollama.js";
import { initSystemPanel, loadSystem } from "./panels/system.js";

initNav();
initSystemPanel();
initOllamaPanel();
initModelsPanel();

// Any action that changes model state reloads the model tables.
setRefreshHook(() => loadModels({ quiet: true }));

loadSystem();
// Status first, so the models tables can explain an empty list.
loadOllamaStatus().then(() => loadModels());
