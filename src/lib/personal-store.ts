import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import {
  rememberTocPhrase,
  translateTocNote,
} from "./translate-note";

type StoreMap = Record<string, string>;

export function createSyncedTextStore(options: {
  prefix: string;
  eventName: string;
  /** Fallback when a key is missing from localStorage (e.g. published seed). */
  getPublished?: (locale: Locale, key: string) => string | undefined;
}) {
  const { prefix, eventName, getPublished } = options;

  function storageKey(locale: Locale) {
    return `${prefix}:${locale}`;
  }

  function otherLocale(locale: Locale): Locale {
    return locale === "zh" ? "en" : "zh";
  }

  function writeAll(locale: Locale, data: StoreMap) {
    window.localStorage.setItem(storageKey(locale), JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent(eventName, { detail: { locale } }),
    );
  }

  function load(locale: Locale): StoreMap {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(storageKey(locale));
      if (!raw) return {};
      const parsed = JSON.parse(raw) as StoreMap;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function resolve(locale: Locale, key: string, defaultText: string): string {
    const data = load(locale);
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return data[key] ?? "";
    }
    const published = getPublished?.(locale, key);
    if (published !== undefined) return published;
    return defaultText;
  }

  function persist(locale: Locale, key: string, value: string): StoreMap {
    const next = { ...load(locale), [key]: value };
    writeAll(locale, next);
    return next;
  }

  async function save(
    locale: Locale,
    key: string,
    value: string,
  ): Promise<StoreMap> {
    const trimmed = value.trim();
    const saved = persist(locale, key, trimmed);
    const peer = otherLocale(locale);

    if (trimmed === "") {
      persist(peer, key, "");
      return saved;
    }

    const translated = await translateTocNote(trimmed, locale, peer);
    rememberTocPhrase(trimmed, translated, locale);
    persist(peer, key, translated);
    return saved;
  }

  async function syncFromLocale(from: Locale, to: Locale) {
    if (from === to || typeof window === "undefined") return;

    const source = load(from);
    const target = load(to);
    let changed = false;
    const next: StoreMap = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (Object.prototype.hasOwnProperty.call(target, key)) continue;
      if (value === "") {
        next[key] = "";
      } else {
        const translated = await translateTocNote(value, from, to);
        rememberTocPhrase(value, translated, from);
        next[key] = translated;
      }
      changed = true;
    }

    if (changed) writeAll(to, next);
  }

  async function ensureCrossLocale() {
    if (typeof window === "undefined") return;
    for (const from of locales) {
      await syncFromLocale(from, otherLocale(from));
    }
  }

  function removeKeysMatching(predicate: (key: string) => boolean) {
    if (typeof window === "undefined") return;
    for (const locale of locales) {
      const data = load(locale);
      const next: StoreMap = {};
      let changed = false;
      for (const [key, value] of Object.entries(data)) {
        if (predicate(key)) {
          changed = true;
          continue;
        }
        next[key] = value;
      }
      if (changed) writeAll(locale, next);
    }
  }

  return {
    eventName,
    load,
    resolve,
    save,
    ensureCrossLocale,
    removeKeysMatching,
  };
}
