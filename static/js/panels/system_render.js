// Renderers for the System tab, turning a core scanner profile into markup.

import { escapeHtml, fmt, specGrid, specRows, usageBar } from "../lib/format.js";

/**
 * Paint the four summary cards at the top of the tab.
 *
 * @param {object} profile Scanner profile.
 */
export function renderSummary(profile) {
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

/**
 * Paint the operating system and runtime spec tables.
 *
 * @param {object} profile Scanner profile.
 */
export function renderSoftware(profile) {
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

/**
 * Paint the processor spec table.
 *
 * @param {object} profile Scanner profile.
 */
export function renderCpu(profile) {
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

/**
 * Paint memory totals and one tile per physical module.
 *
 * @param {object} profile Scanner profile.
 */
export function renderMemory(profile) {
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

/**
 * Paint GPU counts and one tile per detected device.
 *
 * @param {object} profile Scanner profile.
 */
export function renderGpu(profile) {
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

/**
 * Paint one tile per mounted drive.
 *
 * @param {object} profile Scanner profile.
 */
export function renderStorage(profile) {
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
