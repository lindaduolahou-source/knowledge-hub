import type { Locale } from "@/i18n/config";
import {
  rememberTocPhrase,
  translateTocNote,
} from "@/lib/translate-note";

/** User-defined label + value slot on an item. */
export type ExtraField = {
  id: string;
  label: string;
  value: string;
};

/** Structure-only field id (texts live in module-content keys). */
export type ExtraFieldRef = {
  id: string;
};

export function createExtraFieldId() {
  return `field-${Date.now().toString(36)}`;
}

export function normalizeExtraFields(value: unknown): ExtraField[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is ExtraField =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as ExtraField).id === "string",
    )
    .map((item) => ({
      id: item.id,
      label: typeof item.label === "string" ? item.label : "",
      value: typeof item.value === "string" ? item.value : "",
    }));
}

export function normalizeExtraFieldRefs(value: unknown): ExtraFieldRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is ExtraFieldRef =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as ExtraFieldRef).id === "string" &&
        Boolean((item as ExtraFieldRef).id),
    )
    .map((item) => ({ id: item.id }));
}

export function cloneExtraFields(fields: ExtraField[]): ExtraField[] {
  return fields.map((field) => ({ ...field }));
}

export function cloneExtraFieldRefs(fields: ExtraFieldRef[]): ExtraFieldRef[] {
  return fields.map((field) => ({ id: field.id }));
}

/** Keep peer field ids in sync; preserve peer label/value when id already exists. */
export function alignExtraFields(
  source: ExtraField[],
  peerPrev: ExtraField[],
): ExtraField[] {
  const prevById = new Map(peerPrev.map((field) => [field.id, field]));
  return source.map((field) => {
    const old = prevById.get(field.id);
    return old
      ? { id: field.id, label: old.label, value: old.value }
      : { ...field };
  });
}

export async function translateExtraFields(
  fields: ExtraField[],
  from: Locale,
  to: Locale,
): Promise<ExtraField[]> {
  const next: ExtraField[] = [];
  for (const field of fields) {
    const label = field.label.trim()
      ? await translateTocNote(field.label, from, to)
      : "";
    const value = field.value.trim()
      ? await translateTocNote(field.value, from, to)
      : "";
    if (field.label.trim() && label) {
      rememberTocPhrase(field.label, label, from);
    }
    next.push({ id: field.id, label, value });
  }
  return next;
}
