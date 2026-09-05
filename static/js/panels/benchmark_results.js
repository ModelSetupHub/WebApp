// Renderers for a finished comparison: the verdict, the per-metric bars, the
// summary table and the per-prompt detail.
//
// compare_tests answers with {model, tests: [{name, configuration, results,
// summary}, ...]}, so everything here is derived from that one shape.

import { escapeHtml } from "../lib/format.js";
import { t, tn } from "../lib/i18n.js";
import { setButtonBusy, toast } from "../lib/toast.js";
import { postJson } from "../lib/api.js";
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
  {
    key: "average_ttft_seconds",
    title: "bench.metricTtft",
    note: "bench.metricTtftNote",
    short: "bench.metricTtftShort",
    better: "low",
    digits: 3,
  },
];

/**
 * Derive the comparison-level TTFT average from the per-prompt rows.
 *
 * Core times the first streamed token per prompt; the four-metric layout wants
 * it averaged per configuration like the other three metrics, which Core's
 * summary does not carry yet, so the mean is taken here from exactly the rows
 * that reported one.
 *
 * @param {Array<object>} tests Tests from compare_tests, updated in place.
 */
function deriveTtftAverages(tests) {
  tests.forEach((test) => {
    const values = (test.results || [])
      .filter(
        (row) =>
          row.success &&
          row.ttft_seconds !== null &&
          row.ttft_seconds !== undefined
      )
      .map((row) => row.ttft_seconds);

    test.summary.average_ttft_seconds = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  });
}

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
 * Format a metric as its mean with the noise band the repetitions measured.
 *
 * The spread is the run-to-run noise: an average without it is only half the
 * finding, since two configurations a hair apart may be naming the same speed.
 * Core reports the noise of an average under the base metric's name (the
 * output-speed noise lands on "output_tokens_per_second_stddev"), and a test
 * measured once has no spread at all, getting the bare number.
 *
 * @param {object} summary One test's summary statistics.
 * @param {object} metric Metric descriptor.
 * @returns {string} Display text such as "12.4 ± 0.3".
 */
function numWithNoise(summary, metric) {
  const mean = num(summary[metric.key], metric.digits);

  if (summary[metric.key] === null || summary[metric.key] === undefined) {
    return mean;
  }

  const spread = summary[`${metric.key.replace(/^average_/, "")}_stddev`];

  if (spread === null || spread === undefined) {
    return mean;
  }

  return `${mean} ± ${Number(spread).toFixed(metric.digits)}`;
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
            <span class="bench-bar-name" dir="ltr">${escapeHtml(test.name)}</span>
            <span class="bench-bar-value${isBest ? " is-best" : ""}${missing ? " is-empty" : ""}" dir="ltr">
              ${escapeHtml(numWithNoise(test.summary, metric))}
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
          numWithNoise(test.summary, metric)
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
 * on, and response time follows from it for a fixed prompt set. When the
 * comparison measured each prompt more than once, Core's own significance
 * assessment is shown under the verdict — it is the part that says whether the
 * gap survives the noise, which is the difference between a finding and a
 * coin flip.
 *
 * @param {Array<object>} tests Tests from compare_tests.
 * @param {object|null} significance The result's significance assessment.
 * @returns {string} HTML markup.
 */
function verdict(tests, significance) {
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

    // The noise assessment overrides the raw gain: announcing "12% faster"
    // above an assessment that says the gap is within noise would answer the
    // question twice with opposite answers.
    if (significance && significance.significant === false) {
      note = t("bench.verdictWithinNoise");
    } else if (gain >= 0.5) {
      note = t("bench.verdictGain", { percent: gain.toFixed(1) });
    } else {
      note = t("bench.verdictTied");
    }
  }

  let assessment = "";

  if (significance) {
    const tone =
      significance.significant === true
        ? "is-good"
        : significance.significant === false
          ? "is-tied"
          : "is-unmeasured";

    const label =
      significance.significant === true
        ? t("bench.significanceReal")
        : significance.significant === false
          ? t("bench.significanceNoise")
          : t("bench.significanceUnknown");

    const message = significance.message || "";

    assessment = `
      <div class="bench-significance ${tone}">
        <span class="bench-significance-label">${escapeHtml(label)}</span>
        <span class="bench-significance-message" dir="auto">${escapeHtml(message)}</span>
      </div>`;
  }

  return `
    <div class="bench-verdict">
      <div>
        <div class="bench-verdict-label">${escapeHtml(t("bench.verdictLabel"))}</div>
        <div class="bench-verdict-name" dir="ltr">${escapeHtml(winner.name)}</div>
        <div class="bench-verdict-note">${escapeHtml(note)}</div>
      </div>
      ${assessment}
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

      // The machine readings are optional: they are absent on a machine
      // without an NVIDIA GPU, or when a generation produced no content, and
      // are shown only when Core actually reported them.
      const measurements = [
        {
          key: "ttft_seconds",
          digits: 3,
          stat: "bench.statTtft",
        },
        {
          key: "vram_used_mb",
          digits: 0,
          stat: "bench.statVram",
        },
        {
          key: "gpu_temperature_c",
          digits: 1,
          stat: "bench.statTemperature",
        },
        {
          key: "gpu_clock_mhz",
          digits: 0,
          stat: "bench.statClock",
        },
      ]
        .map((reading) => ({ ...reading, value: result[reading.key] }))
        .filter((reading) => reading.value !== null && reading.value !== undefined);

      const measurementStats = measurements
        .map(
          (reading) => `
            <span class="bench-stat"><b dir="ltr">${num(
              reading.value,
              reading.digits
            )}</b> ${escapeHtml(t(reading.stat))}</span>`
        )
        .join("");

      const measurementBlock = measurementStats
        ? `<div class="bench-prompt-machine">${measurementStats}</div>`
        : "";

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
          ${measurementBlock}
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
/**
 * Build the "keep the winner as a model" form.
 *
 * A comparison that names a winner is only half a finding; this turns the
 * other half into an action — creating a model copy whose Modelfile carries
 * the winning options, without touching the source model. Only offered for
 * configuration comparisons: a cross-model run's winner is a model, and a
 * single run has nothing to compare.
 *
 * @param {object} job Finished job snapshot.
 * @param {string} winnerName Name of the fastest test.
 * @returns {string} HTML markup, or "" when the form does not apply.
 */
function applyForm(job, winnerName) {
  if (job.cross_model || (job.result.tests || []).length < 2) {
    return "";
  }

  const suggested = `${(job.result.model || "model").split(":")[0]}-${winnerName}`
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 64);

  return `
    <div class="bench-apply">
      <label class="bench-apply-label" for="bench-apply-name">
        ${escapeHtml(t("bench.applyLabel"))}
      </label>
      <div class="bench-apply-row">
        <input class="input is-ltr" id="bench-apply-name" dir="ltr"
               value="${escapeHtml(suggested)}" spellcheck="false" autocomplete="off">
        <button type="button" class="btn btn-sm btn-primary" data-apply-winner="${escapeHtml(
          winnerName
        )}">${escapeHtml(t("bench.applyButton"))}</button>
      </div>
      <span class="bench-apply-hint">${escapeHtml(t("bench.applyHint"))}</span>
    </div>`;
}

/**
 * Bind the keep-winner form: send the winning options to Core's
 * configure_model through the apply endpoint, and report what came back.
 *
 * @param {HTMLElement} el Results container.
 * @param {object} job Finished job snapshot.
 */
function bindApply(el, job) {
  const button = el.querySelector("[data-apply-winner]");

  if (!button) {
    return;
  }

  const input = el.querySelector("#bench-apply-name");

  button.addEventListener("click", async () => {
    const restore = setButtonBusy(button);

    const winnerTest = (job.result.tests || []).find(
      (test) => test.name === job.winner_name
    );

    try {
      const { data } = await postJson("/api/benchmark/apply", {
        model: job.result.model,
        target: input.value.trim(),
        options: winnerTest ? winnerTest.configuration : {},
      });

      toast("success", t("bench.applied"), String(data || "").slice(0, 160));
    } catch (error) {
      toast("error", t("bench.applyFailed"), error.message);
    } finally {
      restore();
    }
  });
}

/**
 * Paint a finished comparison.
 *
 * Both comparison kinds land here: a configuration comparison (one model,
 * several configurations) and a cross-model one (several models, one shared
 * configuration). Core's result shape is the same for the two — a tests list
 * whose entries carry per-prompt rows and a summary — so the only real
 * difference is which title the results head shows.
 *
 * @param {HTMLElement} el Container element.
 * @param {object} job Finished job snapshot from the status endpoint.
 * @param {object} [options] Behaviour switches. discardEndpoint is the clear
 *     endpoint the discard button posts to — the cross-model drawer passes
 *     its own, since the two jobs live on different endpoints.
 */
export function renderResults(el, job, { discardEndpoint = "/api/benchmark/clear" } = {}) {
  const result = job.result || {};
  const tests = result.tests || [];

  if (tests.length === 0) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(t("bench.noResults"))}</div>`;
    return;
  }

  deriveTtftAverages(tests);

  const significance = result.significance || null;
  const reps = job.repetitions || 1;
  const head = job.cross_model
    ? t("bench.resultsHeadModels", { n: tests.length })
    : t("bench.resultsHead", { model: result.model, n: tests.length });

  // The winner the apply form defaults to: same rule the verdict uses —
  // fastest average generation rate. Shared through the job so bindApply can
  // find the winning test's options without recomputing.
  const winnerTest = tests
    .filter((test) => test.summary.average_output_tokens_per_second !== null)
    .sort(
      (a, b) =>
        b.summary.average_output_tokens_per_second -
        a.summary.average_output_tokens_per_second
    )[0];

  job.winner_name = winnerTest ? winnerTest.name : null;
  const winnerName = job.winner_name;

  el.innerHTML = `
    <div class="bench-results">
      <div class="bench-results-head">
        <div>
          <div class="bench-results-title">${escapeHtml(head)}</div>
          <div class="bench-results-sub">${escapeHtml(
            t("bench.resultsSub", {
              prompts: job.prompts.length,
              seconds: num(job.elapsed_seconds, 1),
              time: job.finished_at || "",
              reps,
            })
          )}</div>
        </div>
        <div class="btn-row">
          ${job.history_id ? `<span class="chip">${escapeHtml(t("bench.savedToHistory"))}</span>` : ""}
          <button type="button" class="btn btn-sm" data-results-discard>${escapeHtml(
            t("bench.discardResults")
          )}</button>
        </div>
      </div>

      ${verdict(tests, significance)}
      ${applyForm(job, winnerName)}

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

  return {
    discardButton: el.querySelector("[data-results-discard]"),
  };
}
