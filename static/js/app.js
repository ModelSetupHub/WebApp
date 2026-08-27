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
  return value === null || value === undefined ? "—" : value + unit;
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

async function loadSystem() {
  const res = await fetch("/api/system");
  const data = await res.json();

  const cardsEl = document.getElementById("system-cards");
  cardsEl.innerHTML = `
    <div class="card">
      <div class="card-label">CPU</div>
      <div class="card-value ${data.cpu_load === null ? "is-unknown" : ""}">${fmt(data.cpu_load, "%")}</div>
      <div class="card-sub">${data.cpu || "not detected"}</div>
    </div>
    <div class="card">
      <div class="card-label">RAM</div>
      <div class="card-value ${data.ram_used_gb === null ? "is-unknown" : ""}">${fmt(data.ram_used_gb, " GB")} / ${fmt(data.ram_total_gb, " GB")}</div>
    </div>
    <div class="card">
      <div class="card-label">GPU</div>
      <div class="card-value ${data.vram_used_gb === null ? "is-unknown" : ""}">${fmt(data.vram_used_gb, " GB")} / ${fmt(data.vram_total_gb, " GB")}</div>
      <div class="card-sub">${data.gpu || "not detected"}</div>
    </div>
  `;
}

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
        <span class="model-name">${m.name}</span>
        <span class="model-size">${fmt(m.size_gb, " GB")}</span>
        <span class="chip ${m.status === "ready" ? "chip-ready" : "chip-loading"}">${m.status || "unknown"}</span>
      </div>`
    )
    .join("");
}

loadSystem();
loadOllama();