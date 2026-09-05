// History section for the Benchmark tab: finished comparisons are saved into
// the toolkit's history automatically, and this collapsible section lists them
// without ever crowding the tab itself. The list loads only when the section
// is first opened, each run's detail opens inline inside its row, and nothing
// here touches the live run the results area is showing.
//
// The server answers:
//   GET    /api/history          the index, newest first
//   GET    /api/history/<id>     one run in full
//   DELETE /api/history/<id>     remove one run

import { api } from "../lib/api.js";
import { escapeHtml } from "../lib/format.js";
import { t, tn } from "../lib/i18n.js";
import { toast } from "../lib/toast.js";

const el = document.getElementById("bench-history");

// Records already fetched. Refetched whenever the section opens, so a run
// that finished while the page sat open still shows up.
let records = [];
let expanded = false;
let loadedOnce = false;

/** Whether the noise verdict is known for a record. */
function noiseVerdict(record) {
  const significant = record.significant;

  if (significant === true || significant === false) {
    return escapeHtml(
      t(significant ? "bench.significanceReal" : "bench.significanceNoise")
    );
  }

  return `<span class="is-dim">${escapeHtml(t("bench.significanceUnknown"))}</span>`;
}

/** Sort the per-configuration averages fastest first. */
function rankedAverages(record) {
  const averages = record.summary?.average_output_tokens_per_second || {};

  return Object.entries(averages)
    .map(([name, rate]) => ({ name, rate }))
    .sort((a, b) => b.rate - a.rate);
}

/** Build one row's inline detail: the per-configuration averages and verdict. */
function detailMarkup(record) {
  const rows = rankedAverages(record)
    .map(
      (entry) => `
        <div class="bench-history-avg">
          <span class="bench-history-avg-name" dir="ltr">${escapeHtml(entry.name)}</span>
          <span class="bench-history-avg-value" dir="ltr">${Number(entry.rate).toFixed(2)} tok/s${
            entry.name === record.summary.winner ? ' <span class="is-winner">★</span>' : ""
          }</span>
        </div>`
    )
    .join("");

  const message = record.result?.significance?.message || "";

  return `
    <div class="bench-history-detail-inner">
      ${rows || `<div class="bench-history-avg">${escapeHtml(t("bench.historyNoAverages"))}</div>`}
      ${message ? `<div class="bench-history-message" dir="auto">${escapeHtml(message)}</div>` : ""}
      <button type="button" class="btn btn-sm btn-danger" data-hact="del" data-hid="${escapeHtml(
        record.id
      )}">${escapeHtml(t("bench.historyDelete"))}</button>
    </div>`;
}

/** Render the section from the current records list. */
function render() {
  const head = `
    <button type="button" class="bench-history-head" aria-expanded="${expanded}">
      <span class="bench-group-caret" aria-hidden="true">▶</span>
      <span class="bench-history-title">${escapeHtml(t("bench.historyTitle"))}</span>
      <span class="bench-history-count">${escapeHtml(
        records.length
          ? tn(records.length, "bench.historyRun", "bench.historyRuns")
          : t("bench.historyEmptyShort")
      )}</span>
    </button>`;

  if (!expanded) {
    el.innerHTML = head;
    return;
  }

  if (records.length === 0) {
    el.innerHTML = `${head}
      <div class="bench-history-body">
        <div class="empty-state">${escapeHtml(t("bench.historyEmpty"))}</div>
      </div>`;
    return;
  }

  const rows = records
    .map(
      (record) => `
        <tbody class="bench-history-group" data-hid="${escapeHtml(record.id)}">
          <tr>
            <td class="is-ltr" dir="ltr">${escapeHtml(record.saved_at || "—")}</td>
            <td class="is-ltr" dir="ltr" title="${escapeHtml(
              (record.models || [record.model].filter(Boolean)).join(", ")
            )}">${escapeHtml(
              (record.models || [record.model].filter(Boolean)).join(", ") || "—"
            )}</td>
            <td class="is-number">${record.configuration_count ?? "—"}</td>
            <td class="is-number">${record.prompt_count ?? "—"}</td>
            <td class="is-ltr" dir="ltr">${escapeHtml(record.winner || "—")}</td>
            <td>${noiseVerdict(record)}</td>
            <td class="bench-history-actions">
              <button type="button" class="btn btn-sm" data-hact="toggle" data-hid="${escapeHtml(
                record.id
              )}">${escapeHtml(t("bench.historyDetails"))}</button>
            </td>
          </tr>
          <tr class="bench-history-detail is-hidden">
            <td colspan="6">${detailMarkup(record)}</td>
          </tr>
        </tbody>`
    )
    .join("");

  el.innerHTML = `${head}
    <div class="bench-history-body">
      <div class="table-wrap">
        <table class="data-table bench-history-table">
          <thead>
            <tr>
              <th>${escapeHtml(t("bench.historyColSaved"))}</th>
              <th>${escapeHtml(t("bench.historyColModel"))}</th>
              <th class="is-number">${escapeHtml(t("bench.historyColConfigs"))}</th>
              <th class="is-number">${escapeHtml(t("bench.historyColPrompts"))}</th>
              <th>${escapeHtml(t("bench.historyColWinner"))}</th>
              <th>${escapeHtml(t("bench.historyColNoise"))}</th>
              <th></th>
            </tr>
          </thead>
          ${rows}
        </table>
      </div>
    </div>`;
}

/** Fetch the index and repaint. */
async function loadList() {
  try {
    records = (await api("/api/history")).data;
    loadedOnce = true;
    render();
  } catch (error) {
    el.innerHTML = `
      <button type="button" class="bench-history-head" aria-expanded="false">
        <span class="bench-group-caret" aria-hidden="true">▶</span>
        <span class="bench-history-title">${escapeHtml(t("bench.historyTitle"))}</span>
      </button>
      <div class="bench-history-body">
        <div class="alert is-hidden" style="display:block">${escapeHtml(
          t("bench.historyLoadFailed", { error: error.message })
        )}</div>
      </div>`;
  }
}

/**
 * Toggle the section open or closed; opening loads the list if it has not
 * been loaded yet, and re-loads it if it has — cheap, and always current.
 *
 * @param {boolean} open Whether the section should be open.
 */
async function toggle(open) {
  expanded = open;
  render();

  if (open) {
    await loadList();
  }
}

/**
 * Toggle one row's inline detail, loading the full record on first open.
 *
 * @param {HTMLElement} group The row group (tbody) holding the record's id.
 */
async function toggleDetail(group) {
  const id = group.dataset.hid;
  const detailRow = group.querySelector(".bench-history-detail");

  if (!detailRow.classList.contains("is-hidden")) {
    detailRow.classList.add("is-hidden");
    return;
  }

  detailRow.classList.remove("is-hidden");

  // The list carries only the summary; the full record (with the significance
  // message) arrives on first open and is cached back into the list.
  const known = records.find((record) => record.id === id);
  const record = known?.result ? known : (await api(`/api/history/${id}`)).data;
  const position = records.findIndex((entry) => entry.id === id);

  if (position !== -1) {
    records[position] = record;
  }

  detailRow.innerHTML = `<td colspan="6">${detailMarkup(record)}</td>`;
}

/**
 * Remove one saved run, with the same confirm-then-toast pattern the rest of
 * the destructive actions use.
 *
 * @param {HTMLElement} group The row group holding the record's id.
 */
async function removeRun(group) {
  const id = group.dataset.hid;

  if (!window.confirm(t("bench.historyDeleteConfirm"))) {
    return;
  }

  try {
    const { data } = await api(`/api/history/${id}`, { method: "DELETE" });

    if (data?.deleted) {
      toast("success", t("bench.historyDeleteDone"), id);
    }

    records = records.filter((record) => record.id !== id);
    render();
  } catch (error) {
    toast("error", t("bench.historyDeleteFailed"), error.message);
  }
}

function bind() {
  el.addEventListener("click", async (event) => {
    const head = event.target.closest(".bench-history-head");

    if (head) {
      await toggle(!expanded);
      return;
    }

    const button = event.target.closest("[data-hact]");

    if (!button) {
      return;
    }

    const group = button.closest(".bench-history-group");

    if (!group) {
      return;
    }

    if (button.dataset.hact === "toggle") {
      await toggleDetail(group);
    } else if (button.dataset.hact === "del") {
      await removeRun(group);
    }
  });
}

/** Bind the history section and paint its collapsed shell. */
export function initHistoryPanel() {
  bind();
  render();
}
