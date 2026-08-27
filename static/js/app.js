// Model Setup Hub — dashboard behaviour

const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".panel-section");

navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const target = item.dataset.section;

    navItems.forEach((n) => n.classList.remove("is-active"));
    item.classList.add("is-active");

    sections.forEach((s) => s.classList.toggle("is-visible", s.id === target));
  });
});

function fmt(value, unit = "") {
  if (value === null || value === undefined || value === "" || value === "Unknown") {
    return "—";
  }
  return value + unit;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function specRows(rows) {
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

// Tile bodies re-flow their pairs into columns as the tile widens, so a lone
// module or drive does not become a tall column of long, empty rows.
function specGrid(rows) {
  return `<div class="spec-grid">${specRows(rows)}</div>`;
}

function usageBar(percent) {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  const level = value >= 85 ? "is-high" : value >= 60 ? "is-mid" : "";
  return `<div class="bar"><div class="bar-fill ${level}" style="width:${value}%"></div></div>`;
}

function skeletons(count) {
  return Array.from({ length: count }, () => `<div class="skeleton"></div>`).join("");
}

function showAlert(el, message) {
  el.textContent = message;
  el.classList.remove("is-hidden");
}

function hideAlert(el) {
  el.classList.add("is-hidden");
}

async function api(path, options = {}) {
  const res = await fetch(path, options);
  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

function postJson(path, payload) {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

const SYSTEM_PANELS = [
  "system-cards",
  "software-specs",
  "runtime-specs",
  "cpu-specs",
  "memory-specs",
  "memory-modules",
  "gpu-specs",
  "gpu-devices",
  "storage-drives",
];

const rescanBtn = document.getElementById("btn-rescan");
const scanMetaEl = document.getElementById("scan-meta");
const systemErrorEl = document.getElementById("system-error");
const hostDotEl = document.getElementById("host-dot");
const hostLabelEl = document.getElementById("host-label");

function setHostStatus(state, label) {
  hostDotEl.classList.toggle("is-online", state === "online");
  hostDotEl.classList.toggle("is-offline", state === "offline");
  hostLabelEl.textContent = label;
}

function clearSystemPanels() {
  SYSTEM_PANELS.forEach((id) => {
    document.getElementById(id).innerHTML = "";
  });
}

function showSystemError(message) {
  showAlert(systemErrorEl, `System scan failed — ${message}`);
  clearSystemPanels();
  setHostStatus("offline", "scan failed");
}

function renderSummary(profile) {
  const cpu = profile.cpu || {};
  const memory = profile.memory || {};
  const gpu = profile.gpu || {};
  const primaryGpu = (gpu.devices || [])[0];
  const storage = profile.storage || [];

  const freeGb = storage.reduce((sum, drive) => sum + (drive.free_gb || 0), 0);
  const totalGb = storage.reduce((sum, drive) => sum + (drive.total_gb || 0), 0);
  const storagePercent = totalGb ? ((totalGb - freeGb) / totalGb) * 100 : 0;

  const gpuPercent = primaryGpu
    ? (parseFloat(primaryGpu.vram_used) / parseFloat(primaryGpu.vram_total)) * 100
    : 0;

  document.getElementById("system-cards").innerHTML = `
    <div class="card">
      <div class="card-label">CPU</div>
      <div class="card-value">${fmt(cpu.physical_cores)}C / ${fmt(cpu.logical_threads)}T</div>
      <div class="card-sub" title="${escapeHtml(fmt(cpu.model))}">${escapeHtml(fmt(cpu.model))}</div>
    </div>
    <div class="card">
      <div class="card-label">Memory</div>
      <div class="card-value">${fmt(memory.used_gb, " GB")} / ${fmt(memory.total_gb, " GB")}</div>
      ${usageBar(memory.usage_percent)}
      <div class="card-sub">${fmt(memory.usage_percent, "% in use")}</div>
    </div>
    <div class="card">
      <div class="card-label">GPU</div>
      <div class="card-value">${primaryGpu ? `${escapeHtml(primaryGpu.vram_used)} / ${escapeHtml(primaryGpu.vram_total)}` : "—"}</div>
      ${primaryGpu ? usageBar(gpuPercent) : ""}
      <div class="card-sub" title="${primaryGpu ? escapeHtml(primaryGpu.name) : ""}">${primaryGpu ? escapeHtml(primaryGpu.name) : "not detected"}</div>
    </div>
    <div class="card">
      <div class="card-label">Storage free</div>
      <div class="card-value">${totalGb ? `${freeGb.toFixed(1)} GB` : "—"}</div>
      ${totalGb ? usageBar(storagePercent) : ""}
      <div class="card-sub">${totalGb ? `across ${storage.length} drive${storage.length === 1 ? "" : "s"}` : "not detected"}</div>
    </div>
  `;
}

function renderSoftware(profile) {
  const system = profile.system || {};

  document.getElementById("software-specs").innerHTML = specRows([
    ["Name", system.name],
    ["Version", system.version],
    ["Build", system.build],
    ["Architecture", system.architecture],
  ]);

  document.getElementById("runtime-specs").innerHTML = specRows([
    ["Python", system.python],
    ["CUDA", (profile.gpu || {}).cuda_version],
    ["GPUs detected", (profile.gpu || {}).count],
  ]);
}

function renderCpu(profile) {
  const cpu = profile.cpu || {};

  document.getElementById("cpu-specs").innerHTML = specRows([
    ["Model", cpu.model],
    ["Architecture", cpu.architecture],
    ["Physical cores", cpu.physical_cores],
    ["Logical threads", cpu.logical_threads],
    ["Reported clock", cpu.reported_clock],
    ["Current frequency", cpu.current_frequency],
    ["Max frequency", cpu.max_frequency],
    ["Instruction sets", (cpu.features || []).join(", ")],
  ]);
}

function renderMemory(profile) {
  const memory = profile.memory || {};
  const modules = memory.modules || [];

  document.getElementById("memory-specs").innerHTML = specRows([
    ["Total", memory.total_gb === undefined ? null : `${memory.total_gb} GB`],
    ["Used", memory.used_gb === undefined ? null : `${memory.used_gb} GB`],
    ["Available", memory.available_gb === undefined ? null : `${memory.available_gb} GB`],
    ["Usage", memory.usage_percent === undefined ? null : `${memory.usage_percent}%`],
    ["Channels", memory.channels],
    ["Modules installed", modules.length || null],
  ]);

  const modulesEl = document.getElementById("memory-modules");

  if (modules.length === 0) {
    modulesEl.innerHTML = `<div class="empty-state">No RAM module details available.</div>`;
    return;
  }

  modulesEl.innerHTML = modules
    .map(
      (mod) => `
      <div class="tile">
        <div class="tile-head">
          <span class="tile-name" title="${escapeHtml(fmt(mod.slot))}">${escapeHtml(fmt(mod.slot))}</span>
          <span class="chip chip-neutral">${escapeHtml(fmt(mod.type))}</span>
        </div>
        ${specGrid([
          ["Capacity", mod.capacity],
          ["Manufacturer", mod.manufacturer],
          ["Part number", (mod.part_number || "").trim()],
          ["Rated speed", mod.speed],
          ["Configured speed", mod.configured_speed],
        ])}
      </div>`
    )
    .join("");
}

function renderGpu(profile) {
  const gpu = profile.gpu || {};
  const devices = gpu.devices || [];

  document.getElementById("gpu-specs").innerHTML = specRows([
    ["Devices detected", gpu.count === undefined ? null : gpu.count],
    ["CUDA version", gpu.cuda_version],
  ]);

  const devicesEl = document.getElementById("gpu-devices");

  if (devices.length === 0) {
    devicesEl.innerHTML = `<div class="empty-state">No NVIDIA GPU detected.</div>`;
    return;
  }

  devicesEl.innerHTML = devices
    .map((dev) => {
      const percent = (parseFloat(dev.vram_used) / parseFloat(dev.vram_total)) * 100;
      return `
        <div class="tile">
          <div class="tile-head">
            <span class="tile-name" title="${escapeHtml(fmt(dev.name))}">${escapeHtml(fmt(dev.name))}</span>
            <span class="chip chip-neutral">CC ${escapeHtml(fmt(dev.compute_capability))}</span>
          </div>
          ${Number.isFinite(percent) ? usageBar(percent) : ""}
          ${specGrid([
            ["Driver", dev.driver],
            ["VRAM total", dev.vram_total],
            ["VRAM used", dev.vram_used],
            ["VRAM free", dev.vram_free],
          ])}
        </div>`;
    })
    .join("");
}

function renderStorage(profile) {
  const drives = profile.storage || [];
  const drivesEl = document.getElementById("storage-drives");

  if (drives.length === 0) {
    drivesEl.innerHTML = `<div class="empty-state">No drives detected.</div>`;
    return;
  }

  drivesEl.innerHTML = drives
    .map((drive) => {
      const percent = drive.total_gb ? (drive.used_gb / drive.total_gb) * 100 : 0;
      return `
        <div class="tile">
          <div class="tile-head">
            <span class="tile-name">${escapeHtml(drive.drive)}</span>
            <span class="model-size">${percent.toFixed(0)}% used</span>
          </div>
          ${usageBar(percent)}
          ${specGrid([
            ["Total", `${drive.total_gb} GB`],
            ["Used", `${drive.used_gb} GB`],
            ["Free", `${drive.free_gb} GB`],
          ])}
        </div>`;
    })
    .join("");
}

async function loadSystem({ refresh = false } = {}) {
  rescanBtn.disabled = true;
  scanMetaEl.textContent = refresh ? "Rescanning…" : "Scanning…";
  document.getElementById("system-cards").innerHTML = skeletons(4);

  try {
    const res = await fetch(`/api/system${refresh ? "?refresh=1" : ""}`);
    const data = await res.json();

    if (!data.ok) {
      scanMetaEl.textContent = "";
      showSystemError(data.error || "unknown error");
      return;
    }

    hideAlert(systemErrorEl);

    const profile = data.profile;
    renderSummary(profile);
    renderSoftware(profile);
    renderCpu(profile);
    renderMemory(profile);
    renderGpu(profile);
    renderStorage(profile);

    scanMetaEl.textContent = `Scanned ${data.scanned_at}${data.cached ? " (cached)" : ""}`;
    setHostStatus("online", (profile.system || {}).name || "host online");
  } catch (error) {
    scanMetaEl.textContent = "";
    showSystemError(error.message);
  } finally {
    rescanBtn.disabled = false;
  }
}

rescanBtn.addEventListener("click", () => loadSystem({ refresh: true }));

// ---------------------------------------------------------------------------
// Ollama runtime
// ---------------------------------------------------------------------------

const ollamaErrorEl = document.getElementById("ollama-error");
const refreshStatusBtn = document.getElementById("btn-refresh-status");

// Cached so the Models page can tell "no models installed" apart from
// "Ollama is not running", which produce the same empty table.
let ollamaStatus = null;

function statusChip(state, label) {
  const cls = state === true ? "chip-ready" : state === false ? "chip-loading" : "chip-neutral";
  return `<span class="chip ${cls}">${escapeHtml(label)}</span>`;
}

async function loadOllamaStatus() {
  refreshStatusBtn.disabled = true;
  document.getElementById("ollama-cards").innerHTML = skeletons(3);

  try {
    const { data } = await api("/api/ollama/status");
    ollamaStatus = data;
    hideAlert(ollamaErrorEl);

    document.getElementById("ollama-cards").innerHTML = `
      <div class="card">
        <div class="card-label">Installed</div>
        <div class="card-value">${data.installed ? "yes" : "no"}</div>
        <div class="card-sub">${data.installed ? "binary found on PATH" : "ollama binary not found"}</div>
      </div>
      <div class="card">
        <div class="card-label">Server</div>
        <div class="card-value">${data.running ? "running" : "stopped"}</div>
        <div class="card-sub">local API on port 11434</div>
      </div>
      <div class="card">
        <div class="card-label">Version</div>
        <div class="card-value">${escapeHtml(fmt(data.version))}</div>
      </div>
    `;

    document.getElementById("ollama-specs").innerHTML = specRows([
      ["Installed", data.installed ? "yes" : "no"],
      ["Server running", data.running ? "yes" : "no"],
      ["Version", data.version],
    ]);
  } catch (error) {
    ollamaStatus = null;
    showAlert(ollamaErrorEl, `Could not read Ollama status — ${error.message}`);
    document.getElementById("ollama-cards").innerHTML = "";
    document.getElementById("ollama-specs").innerHTML = "";
  } finally {
    refreshStatusBtn.disabled = false;
  }
}

refreshStatusBtn.addEventListener("click", loadOllamaStatus);

// ---------------------------------------------------------------------------
// Models — console
// ---------------------------------------------------------------------------

const consoleEl = document.getElementById("console");

function writeConsole(call, text, { isError = false } = {}) {
  const time = new Date().toLocaleTimeString();
  const body = String(text ?? "").trim() || "(no output)";

  consoleEl.innerHTML = `
    <div class="console-head">
      <span class="console-call">${escapeHtml(call)}</span>
      ${statusChip(!isError, isError ? "failed" : "ok")}
      <span class="console-time">${escapeHtml(time)}</span>
    </div>
    <pre class="console-body${isError ? " is-error" : ""}">${escapeHtml(body)}</pre>
  `;
  consoleEl.scrollTop = 0;
}

function writeConsolePending(call) {
  consoleEl.innerHTML = `
    <div class="console-head">
      <span class="console-call">${escapeHtml(call)}</span>
      ${statusChip(null, "running…")}
    </div>
    <div class="skeleton" style="height:58px"></div>
  `;
}

/** Run one core call, reporting its outcome in the output panel. */
async function runAction(call, work, { onSuccess, refresh = true } = {}) {
  writeConsolePending(call);

  try {
    const result = await work();
    writeConsole(call, onSuccess ? onSuccess(result) : result.data);

    if (refresh) {
      await loadModels({ quiet: true });
    }

    return true;
  } catch (error) {
    writeConsole(call, error.message, { isError: true });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Models — tables
// ---------------------------------------------------------------------------

const modelsErrorEl = document.getElementById("models-error");
const modelsMetaEl = document.getElementById("models-meta");
const refreshModelsBtn = document.getElementById("btn-refresh-models");

// Names from the installed list, used to repopulate the action dropdowns.
let installedModels = [];

function emptyTableNote() {
  if (ollamaStatus && ollamaStatus.installed === false) {
    return "Ollama is not installed, so no models can be listed.";
  }
  if (ollamaStatus && ollamaStatus.running === false) {
    return "The Ollama server is not running.";
  }
  return "No models installed.";
}

function renderModelsTable(table) {
  const el = document.getElementById("models-table");
  const rows = table.rows || [];

  if (rows.length === 0) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(emptyTableNote())}</div>`;
    return;
  }

  const headers = (table.columns || []).map((c) => `<th>${escapeHtml(c)}</th>`).join("");

  const body = rows
    .map((row) => {
      const name = row.name || "";
      const cells = (table.columns || [])
        .map((col, i) => {
          const cls = i === 0 ? ' class="cell-name"' : "";
          return `<td${cls}>${escapeHtml(fmt(row[col]))}</td>`;
        })
        .join("");

      return `
        <tr>
          ${cells}
          <td class="cell-actions">
            <div class="btn-row">
              <button type="button" class="btn btn-sm" data-act="info" data-model="${escapeHtml(name)}">Info</button>
              <button type="button" class="btn btn-sm" data-act="load" data-model="${escapeHtml(name)}">Load</button>
              <button type="button" class="btn btn-sm" data-act="stop" data-model="${escapeHtml(name)}">Stop</button>
              <button type="button" class="btn btn-sm btn-danger" data-act="remove" data-model="${escapeHtml(name)}">Remove</button>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${headers}<th></th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function renderRunningTable(table) {
  const el = document.getElementById("running-table");
  const rows = table.rows || [];

  if (rows.length === 0) {
    el.innerHTML = `<div class="empty-state">No model is currently loaded in memory.</div>`;
    return;
  }

  const headers = (table.columns || []).map((c) => `<th>${escapeHtml(c)}</th>`).join("");

  const body = rows
    .map((row) => {
      const name = row.name || "";
      const cells = (table.columns || [])
        .map((col, i) => {
          const cls = i === 0 ? ' class="cell-name"' : "";
          return `<td${cls}>${escapeHtml(fmt(row[col]))}</td>`;
        })
        .join("");

      return `
        <tr>
          ${cells}
          <td class="cell-actions">
            <div class="btn-row">
              <button type="button" class="btn btn-sm btn-danger" data-act="stop" data-model="${escapeHtml(name)}">Stop</button>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${headers}<th></th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function syncModelSelects() {
  document.querySelectorAll("[data-model-select]").forEach((select) => {
    const previous = select.value;

    if (installedModels.length === 0) {
      select.innerHTML = `<option value="">no models installed</option>`;
      select.disabled = true;
      return;
    }

    select.disabled = false;
    select.innerHTML = installedModels
      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join("");

    if (installedModels.includes(previous)) {
      select.value = previous;
    }
  });
}

function renderModelsCards(installed, running) {
  document.getElementById("models-cards").innerHTML = `
    <div class="card">
      <div class="card-label">Installed</div>
      <div class="card-value">${installed}</div>
      <div class="card-sub">models on disk</div>
    </div>
    <div class="card">
      <div class="card-label">Loaded</div>
      <div class="card-value">${running}</div>
      <div class="card-sub">models resident in memory</div>
    </div>
    <div class="card">
      <div class="card-label">Server</div>
      <div class="card-value">${ollamaStatus ? (ollamaStatus.running ? "running" : "stopped") : "—"}</div>
      <div class="card-sub">${ollamaStatus ? escapeHtml(fmt(ollamaStatus.version, " · ollama")) : "status unknown"}</div>
    </div>
  `;
}

async function loadModels({ quiet = false } = {}) {
  refreshModelsBtn.disabled = true;

  if (!quiet) {
    modelsMetaEl.textContent = "Loading…";
    document.getElementById("models-cards").innerHTML = skeletons(3);
  }

  try {
    const [listRes, runningRes] = await Promise.all([
      api("/api/ollama/models"),
      api("/api/ollama/models/running"),
    ]);

    hideAlert(modelsErrorEl);

    const list = listRes.data;
    const running = runningRes.data;

    installedModels = (list.rows || []).map((row) => row.name).filter(Boolean);

    renderModelsCards(installedModels.length, (running.rows || []).length);
    renderModelsTable(list);
    renderRunningTable(running);
    syncModelSelects();

    modelsMetaEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    showAlert(modelsErrorEl, `Could not list models — ${error.message}`);
    modelsMetaEl.textContent = "";
  } finally {
    refreshModelsBtn.disabled = false;
  }
}

refreshModelsBtn.addEventListener("click", () => loadModels());

// ---------------------------------------------------------------------------
// Models — actions
// ---------------------------------------------------------------------------

/** Render the sections returned by show_model_info as plain text. */
function formatModelInfo(data) {
  if (!data.sections || data.sections.length === 0) {
    return data.raw || "";
  }

  return data.sections
    .map((section) => {
      const rows = section.rows
        .map(([key, value]) => `  ${key.padEnd(20)}${value}`)
        .join("\n");
      return `${section.title}\n${rows}`;
    })
    .join("\n\n");
}

function rowAction(act, model) {
  if (act === "info") {
    return runAction(
      `show_model_info("${model}")`,
      () => api(`/api/ollama/models/info?model=${encodeURIComponent(model)}`),
      { onSuccess: (res) => formatModelInfo(res.data), refresh: false }
    );
  }

  if (act === "load") {
    return runAction(
      `load_model("${model}")`,
      () => postJson("/api/ollama/models/load", { model, keep_alive: "10m" }),
      {
        onSuccess: (res) =>
          res.already_loaded
            ? `Model "${model}" is already loaded.`
            : `Model "${model}" loaded into memory.`,
      }
    );
  }

  if (act === "stop") {
    return runAction(
      `stop_model("${model}")`,
      () => postJson("/api/ollama/models/stop", { model }),
      { onSuccess: (res) => res.data || `Model "${model}" stopped.` }
    );
  }

  if (act === "remove") {
    // Deleting a model is not recoverable from this UI, so confirm first.
    if (!window.confirm(`Remove "${model}" from local Ollama storage? This cannot be undone.`)) {
      return Promise.resolve(false);
    }

    return runAction(
      `remove_model("${model}")`,
      () => postJson("/api/ollama/models/remove", { model }),
      { onSuccess: (res) => res.data || `Model "${model}" removed.` }
    );
  }

  return Promise.resolve(false);
}

// Rows are re-rendered on every refresh, so listen on the containers instead
// of binding each button.
["models-table", "running-table"].forEach((id) => {
  document.getElementById(id).addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");

    if (!button) {
      return;
    }

    rowAction(button.dataset.act, button.dataset.model);
  });
});

document.getElementById("form-run").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const model = form.model.value;
  const prompt = form.prompt.value;

  if (!model) {
    writeConsole("run_model", "Select a model first.", { isError: true });
    return;
  }

  if (!prompt.trim()) {
    writeConsole("run_model", "Enter a prompt first.", { isError: true });
    return;
  }

  runAction(
    `run_model("${model}")`,
    () => postJson("/api/ollama/models/run", { model, prompt }),
    { refresh: false }
  );
});

document.getElementById("form-load").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const model = form.model.value;
  const keepAlive = form.keep_alive.value.trim() || "10m";

  if (!model) {
    writeConsole("load_model", "Select a model first.", { isError: true });
    return;
  }

  runAction(
    `load_model("${model}", keep_alive="${keepAlive}")`,
    () => postJson("/api/ollama/models/load", { model, keep_alive: keepAlive }),
    {
      onSuccess: (res) =>
        res.already_loaded
          ? `Model "${model}" is already loaded.`
          : `Model "${model}" loaded into memory.`,
    }
  );
});

document.getElementById("form-add").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.model_name.value.trim();
  const path = form.model_path.value.trim();

  if (!name || !path) {
    writeConsole("add_model", "Both a model name and a file path are required.", { isError: true });
    return;
  }

  runAction(
    `add_model("${name}")`,
    () => postJson("/api/ollama/models/add", { model_name: name, model_path: path }),
    { onSuccess: (res) => res.data || `Model "${name}" created.` }
  );
});

const CONFIG_PARAMS = [
  "num_ctx",
  "temperature",
  "top_p",
  "top_k",
  "repeat_penalty",
  "num_predict",
];

document.getElementById("form-configure").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const source = form.source_model.value;
  const target = form.target_model.value.trim();

  const parameters = {};
  CONFIG_PARAMS.forEach((key) => {
    const value = form[key].value.trim();
    if (value !== "") {
      parameters[key] = Number(value);
    }
  });

  if (!source || !target) {
    writeConsole("configure_model", "A source model and a new model name are required.", { isError: true });
    return;
  }

  if (Object.keys(parameters).length === 0) {
    writeConsole("configure_model", "Set at least one parameter.", { isError: true });
    return;
  }

  runAction(
    `configure_model("${source}" -> "${target}")`,
    () =>
      postJson("/api/ollama/models/configure", {
        source_model: source,
        target_model: target,
        parameters,
      }),
    { onSuccess: (res) => res.data || `Model "${target}" created from "${source}".` }
  );
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

loadSystem();
// Status first, so the models tables can explain an empty list.
loadOllamaStatus().then(() => loadModels());
