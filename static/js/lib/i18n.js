// Language selection and string lookup.
//
// Two languages are supported: English and Persian. The dictionary in
// ./locales/strings.js holds both sides of every string, so English is restored
// exactly rather than being reconstructed from whatever the DOM happened to
// contain when the page loaded.
//
// Switching language reloads the page. Every panel then renders once in the new
// language instead of each render function having to re-translate itself, and
// the only cost is a reload — the hardware scan is cached on the server and a
// benchmark job in flight lives there too, so neither is lost.

import { STRINGS } from "../locales/strings.js";

const STORAGE_KEY = "msh-lang";
const FALLBACK = "en";

export const LANGUAGES = {
  en: { label: "English", short: "EN", dir: "ltr" },
  fa: { label: "فارسی", short: "FA", dir: "rtl" },
};

/**
 * Read the stored language, falling back to English.
 *
 * @returns {"en"|"fa"} Language code.
 */
export function getLang() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored in LANGUAGES ? stored : FALLBACK;
  } catch {
    // Private browsing can make localStorage throw on read.
    return FALLBACK;
  }
}

/** @returns {boolean} Whether the current language reads right to left. */
export function isRtl() {
  return LANGUAGES[getLang()].dir === "rtl";
}

/**
 * Store a language and reload so the whole page renders in it.
 *
 * @param {"en"|"fa"} next Language code.
 */
export function setLang(next) {
  if (!(next in LANGUAGES) || next === getLang()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Nothing to do: without storage the choice cannot outlive the reload.
  }

  window.location.reload();
}

/**
 * Look up a string in the current language.
 *
 * Placeholders are written as {name} and replaced from `params`. A missing key
 * returns the key itself, which is visible in the UI and therefore easier to
 * notice than a silent blank.
 *
 * @param {string} key Dictionary key.
 * @param {object} [params] Placeholder values.
 * @returns {string} Translated text.
 */
export function t(key, params) {
  const entry = STRINGS[key];

  if (!entry) {
    return key;
  }

  let text = entry[getLang()] ?? entry[FALLBACK] ?? key;

  if (params) {
    text = text.replace(/\{(\w+)\}/g, (match, name) =>
      params[name] === undefined ? match : String(params[name])
    );
  }

  return text;
}

/**
 * Pick a singular or plural key by count, and pass the count through.
 *
 * Persian does not inflect the noun after a number, so its two forms are
 * usually identical; keeping the same call shape for both languages means the
 * caller does not need to know that.
 *
 * @param {number} count Quantity.
 * @param {string} one Key for a count of one.
 * @param {string} many Key for any other count.
 * @param {object} [params] Extra placeholder values.
 * @returns {string} Translated text.
 */
export function tn(count, one, many, params) {
  return t(count === 1 ? one : many, { n: count, ...params });
}

/**
 * Translate the static markup Jinja rendered.
 *
 * Elements opt in with data-i18n for their text, data-i18n-placeholder for a
 * placeholder, data-i18n-title for a title, and data-i18n-html where the string
 * carries inline markup.
 */
export function applyStaticStrings() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.dataset.i18nTitle));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });
}

/** Point the document at the current language and reading direction. */
export function applyDocumentLang() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = LANGUAGES[lang].dir;
}
