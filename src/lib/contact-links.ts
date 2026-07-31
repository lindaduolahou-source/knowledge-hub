import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import {
  purgeModuleContentKeys,
  resolveModuleContent,
  setModuleContentLocal,
} from "./module-content";
import { pushContactToTrash } from "./trash";

const STORAGE_KEY = "knowledge-hub:contact-links";
export const CONTACT_LINKS_EVENT = "knowledge-hub:contact-links-updated";

export type ContactLinkDef = {
  id: string;
  /** Built-in kinds keep legacy content keys. */
  kind: "email" | "github" | "custom";
};

export const DEFAULT_CONTACT_LINKS: ContactLinkDef[] = [
  { id: "email", kind: "email" },
  { id: "github", kind: "github" },
];

function emit() {
  window.dispatchEvent(new CustomEvent(CONTACT_LINKS_EVENT));
}

function loadStore(): ContactLinkDef[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContactLinkDef[];
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter(
        (item): item is ContactLinkDef =>
          Boolean(item) &&
          typeof item.id === "string" &&
          (item.kind === "email" ||
            item.kind === "github" ||
            item.kind === "custom"),
      )
      .map((item) => ({ id: item.id, kind: item.kind }));
  } catch {
    return null;
  }
}

function writeStore(links: ContactLinkDef[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  emit();
}

export function loadContactLinks(
  defaults: ContactLinkDef[] = DEFAULT_CONTACT_LINKS,
): ContactLinkDef[] {
  return loadStore() ?? defaults.map((item) => ({ ...item }));
}

export function saveContactLinks(links: ContactLinkDef[]) {
  writeStore(links.map((item) => ({ id: item.id, kind: item.kind })));
}

export function createContactLink(
  current: ContactLinkDef[],
): { links: ContactLinkDef[]; id: string } {
  const id = `link-${Date.now().toString(36)}`;
  const links = [...current, { id, kind: "custom" as const }];
  saveContactLinks(links);
  return { links, id };
}

export function contactLabelKey(id: string, kind: ContactLinkDef["kind"]) {
  if (kind === "email" || kind === "github") return null;
  return `contact:link:${id}:label`;
}

export function contactValueKey(id: string, kind: ContactLinkDef["kind"]) {
  if (kind === "email") return "contact:email";
  if (kind === "github") return "contact:github";
  return `contact:link:${id}:value`;
}

export function contactValueHref(kind: ContactLinkDef["kind"], value: string) {
  const v = value.trim();
  if (!v) return undefined;
  if (kind === "email" || (v.includes("@") && !v.includes("://"))) {
    return v.startsWith("mailto:") ? v : `mailto:${v}`;
  }
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v.replace(/^\/+/, "")}`;
}

function snapshotContactTexts(link: ContactLinkDef) {
  const labelKey = contactLabelKey(link.id, link.kind);
  const valueKey = contactValueKey(link.id, link.kind);
  const texts: Partial<Record<Locale, { label: string; value: string }>> = {};
  for (const locale of locales) {
    texts[locale] = {
      label: labelKey ? resolveModuleContent(locale, labelKey, "") : "",
      value: resolveModuleContent(locale, valueKey, ""),
    };
  }
  return texts;
}

export function removeContactLink(
  current: ContactLinkDef[],
  id: string,
): ContactLinkDef[] {
  const link = current.find((item) => item.id === id);
  if (link) {
    const texts = snapshotContactTexts(link);
    const display =
      texts.zh?.label?.trim() ||
      texts.en?.label?.trim() ||
      texts.zh?.value?.trim() ||
      texts.en?.value?.trim() ||
      link.id;
    pushContactToTrash({
      title: display,
      link,
      texts,
    });
  }
  const links = current.filter((item) => item.id !== id);
  saveContactLinks(links);
  return links;
}

export function restoreContactLink(
  link: ContactLinkDef,
  texts: Partial<Record<Locale, { label: string; value: string }>>,
): boolean {
  const current = loadContactLinks([]);
  if (current.some((item) => item.id === link.id)) return true;

  saveContactLinks([...current, { id: link.id, kind: link.kind }]);

  const labelKey = contactLabelKey(link.id, link.kind);
  const valueKey = contactValueKey(link.id, link.kind);
  for (const locale of locales) {
    const pair = texts[locale];
    if (!pair) continue;
    if (labelKey) setModuleContentLocal(locale, labelKey, pair.label);
    setModuleContentLocal(locale, valueKey, pair.value);
  }
  return true;
}

export function purgeContactLinkContent(_locale: Locale, id: string) {
  void _locale;
  const kindGuess: ContactLinkDef["kind"] =
    id === "email" ? "email" : id === "github" ? "github" : "custom";
  const keys = [
    contactLabelKey(id, kindGuess),
    contactValueKey(id, kindGuess),
  ].filter((key): key is string => Boolean(key));
  purgeModuleContentKeys(keys);
}

export function purgeContactLinkContentKeys(link: ContactLinkDef) {
  const keys = [
    contactLabelKey(link.id, link.kind),
    contactValueKey(link.id, link.kind),
  ].filter((key): key is string => Boolean(key));
  // Never wipe shared builtin contact keys on permanent trash delete of
  // a single card if those keys are still used by an active link.
  if (link.kind === "email" || link.kind === "github") {
    const active = loadContactLinks([]).some(
      (item) => item.id === link.id || item.kind === link.kind,
    );
    if (active) return;
  }
  purgeModuleContentKeys(keys);
}
