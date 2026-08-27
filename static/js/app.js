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

function usageBar(percent) {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  const level = value >= 85 ? "is-high" : value >= 60 ? "is-mid" : "";
  return `<div class="bar"><div class="bar-fill ${level}" style="width:${value}%"></div></div>`;
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

const rescanBtn = document.getElementById("btn-rescan");
const scanMetaEl = document.getElementById("scan-meta");
const systemErrorEl = document.getElementById("system-error");

function clearSystemPanels() {
  [
    "system-cards",
    "software-specs",
    "cpu-specs",
    "memory-specs",
    "memory-modules",
    "gpu-specs",
    "gpu-devices",
    "storage-drives",
  ].forEach((id) => {
    document.getElementById(id).innerHTML = "";
  });
}

function showSystemError(message) {
  systemErrorEl.textContent = `System scan failed — ${message}`;
  systemErrorEl.classList.remove("is-hidden");
  clearSystemPanels();
}

function renderSummary(profile) {
  const cpu = profile.cpu || {};
  const memory = profile.memory || {};
  const gpu = profile.gpu || {};
  const primaryGpu = (gpu.devices || [])[0];

  document.getElementById("system-cards").innerHTML = `
    <div class="card">
      <div class="card-label">CPU</div>
      <div class="card-value">${fmt(cpu.physical_cores)}C / ${fmt(cpu.logical_threads)}T</div>
      <div class="card-sub">${escapeHtml(fmt(cpu.model))}</div>
    </div>
    <div class="card">
      <div class="card-label">RAM</div>
      <div class="card-value">${fmt(memory.used_gb, " GB")} / ${fmt(memory.total_gb, " GB")}</div>
      ${usageBar(memory.usage_percent)}
      <div class="card-sub">${fmt(memory.usage_percent, "% in use")}</div>
    </div>
    <div class="card">
      <div class="card-label">GPU</div>
      <div class="card-value">${primaryGpu ? `${escapeHtml(primaryGpu.vram_used)} / ${escapeHtml(primaryGpu.vram_total)}` : "—"}</div>
      <div class="card-sub">${primaryGpu ? escapeHtml(primaryGpu.name) : "not detected"}</div>
    </div>
  `;
}

function renderSoftware(profile) {
  const system = profile.system || {};

  document.getElementById("software-specs").innerHTML = specRows([
    ["Operating system", system.name],
    ["Version", system.version],
    ["Build", system.build],
    ["Architecture", system.architecture],
    ["Python", system.python],
    ["CUDA", (profile.gpu || {}).cuda_version],
  ]);
}

function renderCpu(profile) {
  const cpu = profile.cpu || {};
  const features = (cpu.features || []).join(", ");

  document.getElementById("cpu-specs").innerHTML = specRows([
    ["Model", cpu.model],
    ["Architecture", cpu.architecture],
    ["Physical cores", cpu.physical_cores],
    ["Logical threads", cpu.logical_threads],
    ["Reported clock", cpu.reported_clock],
    ["Current frequency", cpu.current_frequency],
    ["Max frequency", cpu.max_frequency],
    ["Instruction sets", features],
  ]);
}

function renderMemory(profile) {
  const memory = profile.memory || {};

  document.getElementById("memory-specs").innerHTML = specRows([
    ["Total", memory.total_gb === undefined ? null : `${memory.total_gb} GB`],
    ["Used", memory.used_gb === undefined ? null : `${memory.used_gb} GB`],
    ["Available", memory.available_gb === undefined ? null : `${memory.available_gb} GB`],
    ["Usage", memory.usage_percent === undefined ? null : `${memory.usage_percent}%`],
    ["Channels", memory.channels],
    ["Modules installed", (memory.modules || []).length || null],
  ]);

  const modules = memory.modules || [];
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
          <span class="tile-name">${escapeHtml(fmt(mod.slot))}</span>
          <span class="chip chip-neutral">${escapeHtml(fmt(mod.type))}</span>
        </div>
        ${specRows([
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

  document.getElementById("gpu-specs").innerHTML = specRows([
    ["Devices detected", gpu.count === undefined ? null : gpu.count],
    ["CUDA version", gpu.cuda_version],
  ]);

  const devices = gpu.devices || [];
  const devicesEl = document.getElementById("gpu-devices");

  if (devices.length === 0) {
    devicesEl.innerHTML = `<div class="empty-state">No NVIDIA GPU detected.</div>`;
    return;
  }

  devicesEl.innerHTML = devices
    .map(
      (dev) => `
      <div class="tile">
        <div class="tile-head">
          <span class="tile-name">${escapeHtml(fmt(dev.name))}</span>
          <span class="chip chip-neutral">CC ${escapeHtml(fmt(dev.compute_capability))}</span>
        </div>
        ${specRows([
          ["Driver", dev.driver],
          ["VRAM total", dev.vram_total],
          ["VRAM used", dev.vram_used],
          ["VRAM free", dev.vram_free],
        ])}
      </div>`
    )
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
          ${specRows([
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

  try {
    const res = await fetch(`/api/system${refresh ? "?refresh=1" : ""}`);
    const data = await res.json();

    if (!data.ok) {
      scanMetaEl.textContent = "";
      showSystemError(data.error || "unknown error");
      return;
    }

    systemErrorEl.classList.add("is-hidden");

    const profile = data.profile;
    renderSummary(profile);
    renderSoftware(profile);
    renderCpu(profile);
    renderMemory(profile);
    renderGpu(profile);
    renderStorage(profile);

    scanMetaEl.textContent = `Scanned ${data.scanned_at}${data.cached ? " (cached)" : ""}`;
  } catch (error) {
    scanMetaEl.textContent = "";
    showSystemError(error.message);
  } finally {
    rescanBtn.disabled = false;
  }
}

rescanBtn.addEventListener("click", () => loadSystem({ refresh: true }));

// ---------------------------------------------------------------------------
// Ollama
// ---------------------------------------------------------------------------

async function loadOllama() {
  const res = await fetch("/api/ollama");
  const data = await res.json();

  const listEl = document.getElementById("model-list");

  if (!data.models || data.models.length === 0) {
    listEl.innerHTML = `<div class="empty-state">No models found.</div>`;
    return;
  }

  listEl.innerHTML = data.models
    .map(
      (m) => `
      <div class="model-row">
        <span class="model-name">${escapeHtml(m.name)}</span>
        <span class="model-size">${fmt(m.size_gb, " GB")}</span>
        <span class="chip ${m.status === "ready" ? "chip-ready" : "chip-loading"}">${escapeHtml(m.status || "unknown")}</span>
      </div>`
    )
    .join("");
}

loadSystem();
loadOllama();
