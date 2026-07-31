import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import {
  purgeModuleContentKeys,
  resolveModuleContent,
  setModuleContentLocal,
} from "./module-content";
import {
  cloneExtraFieldRefs,
  createExtraFieldId,
  normalizeExtraFieldRefs,
  type ExtraFieldRef,
} from "./extra-fields";
import {
  cloneCoreSlots,
  normalizeCoreSlots,
} from "./core-slots";
import { pushContactToTrash } from "./trash";
import { moveIndex } from "./reorder";

const STORAGE_KEY = "knowledge-hub:contact-links";
export const CONTACT_LINKS_EVENT = "knowledge-hub:contact-links-updated";

export const CONTACT_CORE_SLOTS = ["label", "value"] as const;
export type ContactCoreSlot = (typeof CONTACT_CORE_SLOTS)[number];

export type ContactLinkDef = {
  id: string;
  /** Built-in kinds keep legacy content keys. */
  kind: "email" | "github" | "custom";
  /** Extra label/value slots (texts in module-content keys). */
  fields: ExtraFieldRef[];
  /** Built-in label/value slots still shown. */
  coreSlots: ContactCoreSlot[];
};

export type ContactLocaleTexts = {
  label: string;
  value: string;
  fields?: Record<string, { label: string; value: string }>;
};

export const DEFAULT_CONTACT_LINKS: ContactLinkDef[] = [
  { id: "email", kind: "email", fields: [], coreSlots: [...CONTACT_CORE_SLOTS] },
  {
    id: "github",
    kind: "github",
    fields: [],
    coreSlots: [...CONTACT_CORE_SLOTS],
  },
];

function emit() {
  window.dispatchEvent(new CustomEvent(CONTACT_LINKS_EVENT));
}

function normalizeLink(item: unknown): ContactLinkDef | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Partial<ContactLinkDef>;
  if (typeof row.id !== "string" || !row.id) return null;
  if (
    row.kind !== "email" &&
    row.kind !== "github" &&
    row.kind !== "custom"
  ) {
    return null;
  }
  return {
    id: row.id,
    kind: row.kind,
    fields: normalizeExtraFieldRefs(row.fields),
    coreSlots: normalizeCoreSlots(row.coreSlots, CONTACT_CORE_SLOTS),
  };
}

function cloneLink(link: ContactLinkDef): ContactLinkDef {
  return {
    id: link.id,
    kind: link.kind,
    fields: cloneExtraFieldRefs(link.fields ?? []),
    coreSlots: cloneCoreSlots(link.coreSlots ?? [...CONTACT_CORE_SLOTS]),
  };
}

function loadStore(): ContactLinkDef[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map(normalizeLink)
      .filter((item): item is ContactLinkDef => Boolean(item));
  } catch {
    return null;
  }
}

function writeStore(links: ContactLinkDef[]) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(links.map(cloneLink)),
  );
  emit();
}

export function loadContactLinks(
  defaults: ContactLinkDef[] = DEFAULT_CONTACT_LINKS,
): ContactLinkDef[] {
  return loadStore() ?? defaults.map(cloneLink);
}

export function saveContactLinks(links: ContactLinkDef[]) {
  writeStore(links);
}

export function createContactLink(
  current: ContactLinkDef[],
): { links: ContactLinkDef[]; id: string } {
  const id = `link-${Date.now().toString(36)}`;
  const links = [...current, { id, kind: "custom" as const, fields: [], coreSlots: [...CONTACT_CORE_SLOTS] }];
  saveContactLinks(links);
  return { links, id };
}

export function setContactLinkCoreSlots(
  current: ContactLinkDef[],
  linkId: string,
  coreSlots: ContactCoreSlot[],
): ContactLinkDef[] {
  const links = current.map((link) =>
    link.id === linkId
      ? { ...link, coreSlots: cloneCoreSlots(coreSlots) }
      : link,
  );
  saveContactLinks(links);
  return links;
}

export function addContactLinkField(
  current: ContactLinkDef[],
  linkId: string,
): { links: ContactLinkDef[]; fieldId: string } | null {
  const fieldId = createExtraFieldId();
  let found = false;
  const links = current.map((link) => {
    if (link.id !== linkId) return link;
    found = true;
    return {
      ...link,
      fields: [...(link.fields ?? []), { id: fieldId }],
    };
  });
  if (!found) return null;
  saveContactLinks(links);
  return { links, fieldId };
}

export function removeContactLinkField(
  current: ContactLinkDef[],
  linkId: string,
  fieldId: string,
): ContactLinkDef[] {
  const links = current.map((link) =>
    link.id === linkId
      ? {
          ...link,
          fields: (link.fields ?? []).filter((field) => field.id !== fieldId),
        }
      : link,
  );
  saveContactLinks(links);
  purgeModuleContentKeys([
    contactFieldLabelKey(linkId, fieldId),
    contactFieldValueKey(linkId, fieldId),
  ]);
  return links;
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

export function contactFieldLabelKey(linkId: string, fieldId: string) {
  return `contact:link:${linkId}:field:${fieldId}:label`;
}

export function contactFieldValueKey(linkId: string, fieldId: string) {
  return `contact:link:${linkId}:field:${fieldId}:value`;
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

function snapshotContactTexts(link: ContactLinkDef): Partial<
  Record<Locale, ContactLocaleTexts>
> {
  const labelKey = contactLabelKey(link.id, link.kind);
  const valueKey = contactValueKey(link.id, link.kind);
  const texts: Partial<Record<Locale, ContactLocaleTexts>> = {};
  for (const locale of locales) {
    const fields: Record<string, { label: string; value: string }> = {};
    for (const field of link.fields ?? []) {
      fields[field.id] = {
        label: resolveModuleContent(
          locale,
          contactFieldLabelKey(link.id, field.id),
          "",
        ),
        value: resolveModuleContent(
          locale,
          contactFieldValueKey(link.id, field.id),
          "",
        ),
      };
    }
    texts[locale] = {
      label: labelKey ? resolveModuleContent(locale, labelKey, "") : "",
      value: resolveModuleContent(locale, valueKey, ""),
      fields,
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
      link: cloneLink(link),
      texts,
    });
  }
  const links = current.filter((item) => item.id !== id);
  saveContactLinks(links);
  return links;
}

export function reorderContactLinks(
  current: ContactLinkDef[],
  from: number,
  to: number,
): ContactLinkDef[] {
  const links = moveIndex(current, from, to);
  if (links === current) return current;
  saveContactLinks(links);
  return links;
}

export function restoreContactLink(
  link: ContactLinkDef,
  texts: Partial<Record<Locale, ContactLocaleTexts>>,
): boolean {
  const current = loadContactLinks([]);
  if (current.some((item) => item.id === link.id)) return true;

  const normalized = cloneLink({
    id: link.id,
    kind: link.kind,
    fields: link.fields ?? [],
    coreSlots: link.coreSlots ?? [...CONTACT_CORE_SLOTS],
  });
  saveContactLinks([...current, normalized]);

  const labelKey = contactLabelKey(link.id, link.kind);
  const valueKey = contactValueKey(link.id, link.kind);
  for (const locale of locales) {
    const pair = texts[locale];
    if (!pair) continue;
    if (labelKey) setModuleContentLocal(locale, labelKey, pair.label);
    setModuleContentLocal(locale, valueKey, pair.value);
    if (pair.fields) {
      for (const [fieldId, fieldTexts] of Object.entries(pair.fields)) {
        setModuleContentLocal(
          locale,
          contactFieldLabelKey(link.id, fieldId),
          fieldTexts.label,
        );
        setModuleContentLocal(
          locale,
          contactFieldValueKey(link.id, fieldId),
          fieldTexts.value,
        );
      }
    }
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
    ...(link.fields ?? []).flatMap((field) => [
      contactFieldLabelKey(link.id, field.id),
      contactFieldValueKey(link.id, field.id),
    ]),
  ].filter((key): key is string => Boolean(key));
  // Never wipe shared builtin contact keys on permanent trash delete of
  // a single card if those keys are still used by an active link.
  if (link.kind === "email" || link.kind === "github") {
    const active = loadContactLinks([]).some(
      (item) => item.id === link.id || item.kind === link.kind,
    );
    if (active) {
      purgeModuleContentKeys(
        (link.fields ?? []).flatMap((field) => [
          contactFieldLabelKey(link.id, field.id),
          contactFieldValueKey(link.id, field.id),
        ]),
      );
      return;
    }
  }
  purgeModuleContentKeys(keys);
}
