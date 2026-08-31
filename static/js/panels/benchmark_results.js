// Renderers for a finished comparison: the verdict, the per-metric bars, the
// summary table and the per-prompt detail.
//
// compare_tests answers with {model, tests: [{name, configuration, results,
// summary}, ...]}, so everything here is derived from that one shape.

import { escapeHtml } from "../lib/format.js";
import { t, tn } from "../lib/i18n.js";
import { indexOfName, seriesColor } from "./benchmark_store.js";
import { optionChips } from "./benchmark_render.js";

// Metrics shown as bar blocks and as table columns. better tells the ranking
// which direction wins: generation rate should be high, wall time should be low.
// Titles and units are dictionary keys rather than literals.
const METRICS = [
  {
    key: "average_output_tokens_per_second",
    title: "bench.metricOutput",
    note: "bench.metricOutputNote",
    short: "bench.metricOutputShort",
    better: "high",
    digits: 1,
  },
  {
    key: "average_prompt_tokens_per_second",
    title: "bench.metricPrompt",
    note: "bench.metricPromptNote",
    short: "bench.metricPromptShort",
    better: "high",
    digits: 1,
  },
  {
    key: "average_duration_seconds",
    title: "bench.metricDuration",
    note: "bench.metricDurationNote",
    short: "bench.metricDurationShort",
    better: "low",
    digits: 2,
  },
];

/**
 * Format a number for display, or an em dash when it is missing.
 *
 * A metric is null whenever Ollama reported no timing for it, which is not the
 * same as zero and must not be ranked as if it were.
 *
 * @param {*} value Metric value.
 * @param {number} digits Decimal places.
 * @returns {string} Display text.
 */
function num(value, digits) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return Number(value).toFixed(digits);
}

/**
 * Return the colour a test is drawn in.
 *
 * Results outlive the configuration list — the list can be edited after a run —
 * so a name that is no longer present falls back to its position in the results.
 *
 * @param {object} test One entry of compare_tests' tests array.
 * @param {number} position Zero-based position in the results.
 * @returns {string} CSS colour.
 */
function testColor(test, position) {
  const index = indexOfName(test.name);
  return seriesColor(index === -1 ? position : index);
}

/**
 * Find the best value of one metric across every test.
 *
 * @param {Array<object>} tests Tests from compare_tests.
 * @param {object} metric Metric descriptor.
 * @returns {number|null} Best value, or null when no test reported one.
 */
function bestValue(tests, metric) {
  const values = tests
    .map((test) => test.summary[metric.key])
    .filter((value) => value !== null && value !== undefined);

  if (values.length === 0) {
    return null;
  }

  return metric.better === "high" ? Math.max(...values) : Math.min(...values);
}

/**
 * Build the bar blocks, one per metric.
 *
 * Bars are scaled against the best value in their own block, so each block ranks
 * its configurations on its own terms and the blocks stay comparable side by side.
 *
 * @param {Array<object>} tests Tests from compare_tests.
 * @returns {string} HTML markup.
 */
function metricBars(tests) {
  return METRICS.map((metric) => {
    const values = tests
      .map((test) => test.summary[metric.key])
      .filter((value) => value !== null && value !== undefined);

    const max = values.length ? Math.max(...values) : 0;
    const min = values.length ? Math.min(...values) : 0;
    const best = bestValue(tests, metric);

    const rows = tests
      .map((test, position) => {
        const value = test.summary[metric.key];
        const missing = value === null || value === undefined;

        // For a "lower is better" metric the shortest bar would otherwise be the
        // winner, which reads backwards, so the scale is inverted: the best value
        // fills the track in both directions.
        let width = 0;

        if (!missing) {
          if (metric.better === "high") {
            width = max > 0 ? (value / max) * 100 : 0;
          } else {
            width = value > 0 ? (min / value) * 100 : 0;
          }
        }

        const isBest = !missing && value === best;

        return `
          <div class="bench-bar-row" style="--series-color:${testColor(test, position)}">
            <span class="bench-bar-name" dir="ltr" title="${escapeHtml(test.name)}">${escapeHtml(test.name)}</span>
            <span class="bench-bar-value${isBest ? " is-best" : ""}${missing ? " is-empty" : ""}" dir="ltr">
              ${escapeHtml(num(value, metric.digits))}
            </span>
            <span class="bench-bar-track">
              <span class="bench-bar-fill" style="width:${width.toFixed(1)}%"></span>
            </span>
          </div>`;
      })
      .join("");

    return `
      <section class="bench-metric">
        <div class="bench-metric-head">
          <h3 class="bench-metric-title">${escapeHtml(t(metric.title))}</h3>
          <span class="bench-metric-note">${escapeHtml(t(metric.note))}</span>
        </div>
        <div class="bench-metric-rows">${rows}</div>
      </section>`;
  }).join("");
}

/**
 * Build the summary table.
 *
 * @param {Array<object>} tests Tests from compare_tests.
 * @returns {string} HTML markup.
 */
function summaryTable(tests) {
  const bests = METRICS.map((metric) => bestValue(tests, metric));

  const rows = tests
    .map((test, position) => {
      const failed = test.results.filter((result) => !result.success).length;

      const cells = METRICS.map((metric, index) => {
        const value = test.summary[metric.key];
        const isBest =
          value !== null && value !== undefined && value === bests[index] && tests.length > 1;
        return `<td class="is-number${isBest ? " is-best" : ""}" dir="ltr">${escapeHtml(
          num(value, metric.digits)
        )}</td>`;
      }).join("");

      return `
        <tr style="--series-color:${testColor(test, position)}">
          <td class="cell-config" dir="ltr">${escapeHtml(test.name)}</td>
          ${cells}
          <td class="is-number" dir="ltr">${test.summary.total_output_tokens}</td>
          <td class="is-number${failed ? " is-failed" : ""}">
            ${escapeHtml(failed ? t("bench.nFailed", { n: failed }) : t("bench.allPassed"))}
          </td>
        </tr>`;
    })
    .join("");

  const headers = METRICS.map(
    (metric) => `<th class="is-number">${escapeHtml(t(metric.short))}</th>`
  ).join("");

  return `
    <div class="table-wrap">
      <table class="data-table bench-table">
        <thead>
          <tr>
            <th>${escapeHtml(t("bench.colConfiguration"))}</th>
            ${headers}
            <th class="is-number">${escapeHtml(t("bench.colOutputTokens"))}</th>
            <th class="is-number">${escapeHtml(t("bench.colPrompts"))}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/**
 * Build the verdict callout naming the configuration to keep.
 *
 * Output speed decides it: it is the metric a user of the model actually waits
 * on, and response time follows from it for a fixed prompt set.
 *
 * @param {Array<object>} tests Tests from compare_tests.
 * @returns {string} HTML markup.
 */
function verdict(tests) {
  const metric = METRICS[0];
  const best = bestValue(tests, metric);

  if (best === null) {
    return `
      <div class="bench-verdict is-empty">
        <div>
          <div class="bench-verdict-label">${escapeHtml(t("bench.noVerdict"))}</div>
          <div class="bench-verdict-note">${escapeHtml(t("bench.noVerdictNote"))}</div>
        </div>
      </div>`;
  }

  const winner = tests.find((test) => test.summary[metric.key] === best);
  const others = tests.filter((test) => test !== winner);
  const rates = others
    .map((test) => test.summary[metric.key])
    .filter((value) => value !== null && value !== undefined);

  let note = t("bench.verdictOnly");

  if (rates.length > 0) {
    const runnerUp = Math.max(...rates);
    const gain = runnerUp > 0 ? ((best - runnerUp) / runnerUp) * 100 : 0;

    note =
      gain >= 0.5
        ? t("bench.verdictGain", { percent: gain.toFixed(1) })
        : t("bench.verdictTied");
  }

  return `
    <div class="bench-verdict">
      <div>
        <div class="bench-verdict-label">${escapeHtml(t("bench.verdictLabel"))}</div>
        <div class="bench-verdict-name" dir="ltr">${escapeHtml(winner.name)}</div>
        <div class="bench-verdict-note">${escapeHtml(note)}</div>
      </div>
    </div>`;
}

/**
 * Build the collapsible per-prompt detail for one test.
 *
 * @param {object} test One entry of compare_tests' tests array.
 * @param {number} position Zero-based position in the results.
 * @returns {string} HTML markup.
 */
function detail(test, position) {
  const prompts = test.results
    .map((result) => {
      // The prompt is whatever the user typed, so it keeps the page's own
      // direction rather than being forced either way.
      if (!result.success) {
        return `
          <div class="bench-prompt">
            <div class="bench-prompt-head">
              <span class="bench-prompt-index" dir="ltr">#${result.index}</span>
              <span class="bench-prompt-text" title="${escapeHtml(result.prompt)}">${escapeHtml(result.prompt)}</span>
              <span class="chip chip-error">${escapeHtml(t("bench.promptFailed"))}</span>
            </div>
            <div class="bench-prompt-error">${escapeHtml(
              result.error || t("bench.unknownError")
            )}</div>
          </div>`;
      }

      const output =
        result.response === undefined
          ? ""
          : `<pre class="bench-output">${escapeHtml(
              result.response || t("bench.emptyResponse")
            )}</pre>`;

      return `
        <div class="bench-prompt">
          <div class="bench-prompt-head">
            <span class="bench-prompt-index" dir="ltr">#${result.index}</span>
            <span class="bench-prompt-text" title="${escapeHtml(result.prompt)}">${escapeHtml(result.prompt)}</span>
          </div>
          <div class="bench-prompt-stats">
            <span class="bench-stat"><b dir="ltr">${num(result.duration_seconds, 2)}</b> ${escapeHtml(t("bench.statSeconds"))}</span>
            <span class="bench-stat"><b dir="ltr">${num(result.output_tokens_per_second, 1)}</b> ${escapeHtml(t("bench.statOutputRate"))}</span>
            <span class="bench-stat"><b dir="ltr">${num(result.prompt_tokens_per_second, 1)}</b> ${escapeHtml(t("bench.statPromptRate"))}</span>
            <span class="bench-stat"><b dir="ltr">${result.output_tokens}</b> ${escapeHtml(t("bench.statOutputTokens"))}</span>
            <span class="bench-stat"><b dir="ltr">${result.prompt_tokens}</b> ${escapeHtml(t("bench.statPromptTokens"))}</span>
          </div>
          ${output}
        </div>`;
    })
    .join("");

  const failed = test.results.filter((result) => !result.success).length;
  const meta =
    tn(test.results.length, "bench.detailPrompt", "bench.detailPrompts") +
    (failed ? t("bench.detailFailedSuffix", { n: failed }) : "");

  return `
    <article class="bench-detail" style="--series-color:${testColor(test, position)}">
      <button type="button" class="bench-detail-head" aria-expanded="false">
        <span class="bench-group-caret" aria-hidden="true">▶</span>
        <span class="bench-detail-name" dir="ltr">${escapeHtml(test.name)}</span>
        <span class="bench-detail-meta">${escapeHtml(meta)}</span>
      </button>
      <div class="bench-detail-body">
        <div class="bench-detail-options">${optionChips(test.configuration)}</div>
        ${prompts}
      </div>
    </article>`;
}

/**
 * Paint a finished comparison.
 *
 * @param {HTMLElement} el Container element.
 * @param {object} job Finished job snapshot from the status endpoint.
 */
export function renderResults(el, job) {
  const tests = (job.result && job.result.tests) || [];

  if (tests.length === 0) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(t("bench.noResults"))}</div>`;
    return;
  }

  el.innerHTML = `
    <div class="bench-results">
      <div class="bench-results-head">
        <div>
          <div class="bench-results-title">${escapeHtml(
            t("bench.resultsHead", { model: job.result.model, n: tests.length })
          )}</div>
          <div class="bench-results-sub">${escapeHtml(
            t("bench.resultsSub", {
              prompts: job.prompts.length,
              seconds: num(job.elapsed_seconds, 1),
              time: job.finished_at || "",
            })
          )}</div>
        </div>
        <button type="button" class="btn btn-sm" id="btn-bench-discard">${escapeHtml(
          t("bench.discardResults")
        )}</button>
      </div>

      ${verdict(tests)}

      <div class="bench-metrics">${metricBars(tests)}</div>

      ${summaryTable(tests)}

      <div>${tests.map((test, position) => detail(test, position)).join("")}</div>
    </div>`;

  el.querySelectorAll(".bench-detail-head").forEach((head) => {
    head.addEventListener("click", () => {
      const article = head.closest(".bench-detail");
      const open = article.classList.toggle("is-open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
}
