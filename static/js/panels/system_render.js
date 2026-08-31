// Renderers for the System tab, turning a core scanner profile into markup.

import { escapeHtml, fmt, specGrid, specRows, usageBar } from "../lib/format.js";
import { t, tn } from "../lib/i18n.js";

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
      <div class="card-label">${escapeHtml(t("card.cpu"))}</div>
      <div class="card-value" dir="ltr">${fmt(cpu.physical_cores)}C / ${fmt(cpu.logical_threads)}T</div>
      <div class="card-sub" dir="ltr" title="${escapeHtml(fmt(cpu.model))}">${escapeHtml(fmt(cpu.model))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("card.memory"))}</div>
      <div class="card-value" dir="ltr">${fmt(memory.used_gb, " GB")} / ${fmt(memory.total_gb, " GB")}</div>
      ${usageBar(memory.usage_percent)}
      <div class="card-sub">${escapeHtml(t("card.memoryInUse", { n: fmt(memory.usage_percent) }))}</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("card.gpu"))}</div>
      <div class="card-value" dir="ltr">${
        primaryGpu
          ? `${escapeHtml(primaryGpu.vram_used)} / ${escapeHtml(primaryGpu.vram_total)}`
          : "—"
      }</div>
      ${primaryGpu ? usageBar(gpuPercent) : ""}
      <div class="card-sub" dir="ltr" title="${primaryGpu ? escapeHtml(primaryGpu.name) : ""}">${
        primaryGpu ? escapeHtml(primaryGpu.name) : escapeHtml(t("value.notDetected"))
      }</div>
    </div>
    <div class="card">
      <div class="card-label">${escapeHtml(t("card.storageFree"))}</div>
      <div class="card-value" dir="ltr">${totalGb ? `${freeGb.toFixed(1)} GB` : "—"}</div>
      ${totalGb ? usageBar(storagePercent) : ""}
      <div class="card-sub">${
        totalGb
          ? escapeHtml(tn(storage.length, "card.acrossDrive", "card.acrossDrives"))
          : escapeHtml(t("value.notDetected"))
      }</div>
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
    [t("spec.name"), system.name],
    [t("spec.version"), system.version],
    [t("spec.build"), system.build],
    [t("spec.architecture"), system.architecture],
  ]);

  document.getElementById("runtime-specs").innerHTML = specRows([
    [t("spec.python"), system.python],
    [t("spec.cuda"), (profile.gpu || {}).cuda_version],
    [t("spec.gpusDetected"), (profile.gpu || {}).count],
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
    [t("spec.model"), cpu.model],
    [t("spec.architecture"), cpu.architecture],
    [t("spec.physicalCores"), cpu.physical_cores],
    [t("spec.logicalThreads"), cpu.logical_threads],
    [t("spec.reportedClock"), cpu.reported_clock],
    [t("spec.currentFrequency"), cpu.current_frequency],
    [t("spec.maxFrequency"), cpu.max_frequency],
    [t("spec.instructionSets"), (cpu.features || []).join(", ")],
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
    [t("spec.total"), memory.total_gb === undefined ? null : `${memory.total_gb} GB`],
    [t("spec.used"), memory.used_gb === undefined ? null : `${memory.used_gb} GB`],
    [t("spec.available"), memory.available_gb === undefined ? null : `${memory.available_gb} GB`],
    [t("spec.usage"), memory.usage_percent === undefined ? null : `${memory.usage_percent}%`],
    [t("spec.channels"), memory.channels],
    [t("spec.modulesInstalled"), modules.length || null],
  ]);

  const modulesEl = document.getElementById("memory-modules");

  if (modules.length === 0) {
    modulesEl.innerHTML = `<div class="empty-state">${escapeHtml(t("empty.noRamModules"))}</div>`;
    return;
  }

  modulesEl.innerHTML = modules
    .map(
      (mod) => `
      <div class="tile">
        <div class="tile-head">
          <span class="tile-name" dir="ltr" title="${escapeHtml(fmt(mod.slot))}">${escapeHtml(fmt(mod.slot))}</span>
          <span class="chip chip-neutral" dir="ltr">${escapeHtml(fmt(mod.type))}</span>
        </div>
        ${specGrid([
          [t("spec.capacity"), mod.capacity],
          [t("spec.manufacturer"), mod.manufacturer],
          [t("spec.partNumber"), (mod.part_number || "").trim()],
          [t("spec.ratedSpeed"), mod.speed],
          [t("spec.configuredSpeed"), mod.configured_speed],
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
    [t("spec.devicesDetected"), gpu.count === undefined ? null : gpu.count],
    [t("spec.cudaVersion"), gpu.cuda_version],
  ]);

  const devicesEl = document.getElementById("gpu-devices");

  if (devices.length === 0) {
    devicesEl.innerHTML = `<div class="empty-state">${escapeHtml(t("empty.noGpu"))}</div>`;
    return;
  }

  devicesEl.innerHTML = devices
    .map((dev) => {
      const percent = (parseFloat(dev.vram_used) / parseFloat(dev.vram_total)) * 100;
      return `
        <div class="tile">
          <div class="tile-head">
            <span class="tile-name" dir="ltr" title="${escapeHtml(fmt(dev.name))}">${escapeHtml(fmt(dev.name))}</span>
            <span class="chip chip-neutral" dir="ltr">CC ${escapeHtml(fmt(dev.compute_capability))}</span>
          </div>
          ${Number.isFinite(percent) ? usageBar(percent) : ""}
          ${specGrid([
            [t("spec.driver"), dev.driver],
            [t("spec.vramTotal"), dev.vram_total],
            [t("spec.vramUsed"), dev.vram_used],
            [t("spec.vramFree"), dev.vram_free],
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
    drivesEl.innerHTML = `<div class="empty-state">${escapeHtml(t("empty.noDrives"))}</div>`;
    return;
  }

  drivesEl.innerHTML = drives
    .map((drive) => {
      const percent = drive.total_gb ? (drive.used_gb / drive.total_gb) * 100 : 0;
      return `
        <div class="tile">
          <div class="tile-head">
            <span class="tile-name" dir="ltr">${escapeHtml(drive.drive)}</span>
            <span class="model-size">${escapeHtml(
              t("spec.percentUsed", { n: percent.toFixed(0) })
            )}</span>
          </div>
          ${usageBar(percent)}
          ${specGrid([
            [t("spec.total"), `${drive.total_gb} GB`],
            [t("spec.used"), `${drive.used_gb} GB`],
            [t("spec.free"), `${drive.free_gb} GB`],
          ])}
        </div>`;
    })
    .join("");
}
