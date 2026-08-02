import type { ModuleId } from "./modules";
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
import { getPublishedModuleSections } from "./published-site";
import { moveIndex } from "./reorder";
import { pushSectionToTrash } from "./trash";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";

const STORAGE_KEY = "knowledge-hub:module-sections";
export const MODULE_SECTIONS_EVENT = "knowledge-hub:module-sections-updated";

export type SectionVariant = "plain" | "list" | "chips";

export const SECTION_CORE_SLOTS = ["title", "body"] as const;
export type SectionCoreSlot = (typeof SECTION_CORE_SLOTS)[number];

export type ModuleSectionDef = {
  id: string;
  variant: SectionVariant;
  /** Extra label/value slots (texts in module-content keys). */
  fields: ExtraFieldRef[];
  /** Built-in title/body slots still shown. */
  coreSlots: SectionCoreSlot[];
};

export type ModuleSectionDefault = ModuleSectionDef & {
  title: string;
  body: string;
};

export type SectionLocaleTexts = {
  title: string;
  body: string;
  fields?: Record<string, { label: string; value: string }>;
};

type SectionsStore = Record<string, ModuleSectionDef[]>;

function emit(moduleId: string) {
  window.dispatchEvent(
    new CustomEvent(MODULE_SECTIONS_EVENT, { detail: { moduleId } }),
  );
}

function loadStore(): SectionsStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SectionsStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: SectionsStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function normalizeSection(item: unknown): ModuleSectionDef | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Partial<ModuleSectionDef>;
  if (typeof row.id !== "string" || !row.id) return null;
  if (
    row.variant !== "plain" &&
    row.variant !== "list" &&
    row.variant !== "chips"
  ) {
    return null;
  }
  return {
    id: row.id,
    variant: row.variant,
    fields: normalizeExtraFieldRefs(row.fields),
    coreSlots: normalizeCoreSlots(row.coreSlots, SECTION_CORE_SLOTS),
  };
}

function cloneSection(section: ModuleSectionDef): ModuleSectionDef {
  return {
    id: section.id,
    variant: section.variant,
    fields: cloneExtraFieldRefs(section.fields ?? []),
    coreSlots: cloneCoreSlots(section.coreSlots ?? [...SECTION_CORE_SLOTS]),
  };
}

export function sectionTitleKey(
  moduleId: ModuleId | string,
  sectionId: string,
) {
  return `${moduleId}:section:${sectionId}:title`;
}

export function sectionBodyKey(moduleId: ModuleId | string, sectionId: string) {
  // Preserve existing space content keys.
  if (moduleId === "space" && sectionId === "focus") return "space:focus";
  if (moduleId === "space" && sectionId === "skills") return "space:skills";
  return `${moduleId}:section:${sectionId}:body`;
}

export function sectionFieldLabelKey(
  moduleId: ModuleId | string,
  sectionId: string,
  fieldId: string,
) {
  return `${moduleId}:section:${sectionId}:field:${fieldId}:label`;
}

export function sectionFieldValueKey(
  moduleId: ModuleId | string,
  sectionId: string,
  fieldId: string,
) {
  return `${moduleId}:section:${sectionId}:field:${fieldId}:value`;
}

function sectionContentKeys(moduleId: string, section: ModuleSectionDef) {
  const keys = [
    sectionTitleKey(moduleId, section.id),
    sectionBodyKey(moduleId, section.id),
  ];
  for (const field of section.fields ?? []) {
    keys.push(
      sectionFieldLabelKey(moduleId, section.id, field.id),
      sectionFieldValueKey(moduleId, section.id, field.id),
    );
  }
  return keys;
}

export function loadModuleSections(
  moduleId: string,
  defaults: ModuleSectionDef[],
): ModuleSectionDef[] {
  const store = loadStore();
  if (Object.prototype.hasOwnProperty.call(store, moduleId)) {
    const stored = store[moduleId];
    if (Array.isArray(stored)) {
      return stored
        .map(normalizeSection)
        .filter((item): item is ModuleSectionDef => Boolean(item));
    }
  }

  const published = getPublishedModuleSections(moduleId);
  if (published) return published.map(cloneSection);

  return defaults.map(cloneSection);
}

export function saveModuleSections(
  moduleId: string,
  sections: ModuleSectionDef[],
) {
  const store = loadStore();
  store[moduleId] = sections.map(cloneSection);
  writeStore(store);
  emit(moduleId);
}

export function reorderModuleSections(
  moduleId: string,
  current: ModuleSectionDef[],
  from: number,
  to: number,
): ModuleSectionDef[] {
  const sections = moveIndex(current, from, to);
  if (sections === current) return current;
  saveModuleSections(moduleId, sections);
  return sections;
}

export function createModuleSection(
  moduleId: string,
  current: ModuleSectionDef[],
  variant: SectionVariant = "plain",
): { sections: ModuleSectionDef[]; id: string } {
  const id = `sec-${Date.now().toString(36)}`;
  const sections = [
    ...current,
    { id, variant, fields: [], coreSlots: [...SECTION_CORE_SLOTS] },
  ];
  saveModuleSections(moduleId, sections);
  return { sections, id };
}

export function setModuleSectionCoreSlots(
  moduleId: string,
  current: ModuleSectionDef[],
  sectionId: string,
  coreSlots: SectionCoreSlot[],
): ModuleSectionDef[] {
  const sections = current.map((section) =>
    section.id === sectionId
      ? { ...section, coreSlots: cloneCoreSlots(coreSlots) }
      : section,
  );
  saveModuleSections(moduleId, sections);
  return sections;
}

export function addModuleSectionField(
  moduleId: string,
  current: ModuleSectionDef[],
  sectionId: string,
): { sections: ModuleSectionDef[]; fieldId: string } | null {
  const fieldId = createExtraFieldId();
  let found = false;
  const sections = current.map((section) => {
    if (section.id !== sectionId) return section;
    found = true;
    return {
      ...section,
      fields: [...(section.fields ?? []), { id: fieldId }],
    };
  });
  if (!found) return null;
  saveModuleSections(moduleId, sections);
  return { sections, fieldId };
}

export function removeModuleSectionField(
  moduleId: string,
  current: ModuleSectionDef[],
  sectionId: string,
  fieldId: string,
): ModuleSectionDef[] {
  const sections = current.map((section) =>
    section.id === sectionId
      ? {
          ...section,
          fields: (section.fields ?? []).filter((field) => field.id !== fieldId),
        }
      : section,
  );
  saveModuleSections(moduleId, sections);
  purgeModuleContentKeys([
    sectionFieldLabelKey(moduleId, sectionId, fieldId),
    sectionFieldValueKey(moduleId, sectionId, fieldId),
  ]);
  return sections;
}

export function reorderModuleSectionFields(
  moduleId: string,
  current: ModuleSectionDef[],
  sectionId: string,
  from: number,
  to: number,
): ModuleSectionDef[] {
  const sections = current.map((section) => {
    if (section.id !== sectionId) return section;
    const fields = moveIndex(section.fields ?? [], from, to);
    if (fields === (section.fields ?? [])) return section;
    return { ...section, fields };
  });
  if (sections.every((section, i) => section === current[i])) return current;
  saveModuleSections(moduleId, sections);
  return sections;
}

function snapshotSectionTexts(
  moduleId: string,
  section: ModuleSectionDef,
): Partial<Record<Locale, SectionLocaleTexts>> {
  const titleKey = sectionTitleKey(moduleId, section.id);
  const bodyKey = sectionBodyKey(moduleId, section.id);
  const texts: Partial<Record<Locale, SectionLocaleTexts>> = {};
  for (const locale of locales) {
    const fields: Record<string, { label: string; value: string }> = {};
    for (const field of section.fields ?? []) {
      fields[field.id] = {
        label: resolveModuleContent(
          locale,
          sectionFieldLabelKey(moduleId, section.id, field.id),
          "",
        ),
        value: resolveModuleContent(
          locale,
          sectionFieldValueKey(moduleId, section.id, field.id),
          "",
        ),
      };
    }
    texts[locale] = {
      title: resolveModuleContent(locale, titleKey, ""),
      body: resolveModuleContent(locale, bodyKey, ""),
      fields,
    };
  }
  return texts;
}

export function removeModuleSection(
  moduleId: string,
  current: ModuleSectionDef[],
  sectionId: string,
): ModuleSectionDef[] {
  const section = current.find((item) => item.id === sectionId);
  if (section) {
    const texts = snapshotSectionTexts(moduleId, section);
    const display =
      texts.zh?.title?.trim() ||
      texts.en?.title?.trim() ||
      sectionId;
    pushSectionToTrash({
      moduleId,
      title: display,
      section: cloneSection(section),
      texts,
    });
  }
  const sections = current.filter((item) => item.id !== sectionId);
  saveModuleSections(moduleId, sections);
  return sections;
}

export function restoreModuleSection(
  moduleId: string,
  section: ModuleSectionDef,
  texts: Partial<Record<Locale, SectionLocaleTexts>>,
): boolean {
  const current = loadModuleSections(moduleId, []);
  if (current.some((item) => item.id === section.id)) return true;

  const normalized = cloneSection({
    id: section.id,
    variant: section.variant,
    fields: section.fields ?? [],
    coreSlots: section.coreSlots ?? [...SECTION_CORE_SLOTS],
  });
  saveModuleSections(moduleId, [...current, normalized]);

  const titleKey = sectionTitleKey(moduleId, section.id);
  const bodyKey = sectionBodyKey(moduleId, section.id);
  for (const locale of locales) {
    const pair = texts[locale];
    if (!pair) continue;
    setModuleContentLocal(locale, titleKey, pair.title);
    setModuleContentLocal(locale, bodyKey, pair.body);
    if (pair.fields) {
      for (const [fieldId, fieldTexts] of Object.entries(pair.fields)) {
        setModuleContentLocal(
          locale,
          sectionFieldLabelKey(moduleId, section.id, fieldId),
          fieldTexts.label,
        );
        setModuleContentLocal(
          locale,
          sectionFieldValueKey(moduleId, section.id, fieldId),
          fieldTexts.value,
        );
      }
    }
  }
  return true;
}

export function purgeModuleSectionContent(
  moduleId: string,
  sectionId: string,
  fields: ExtraFieldRef[] = [],
) {
  purgeModuleContentKeys(
    sectionContentKeys(moduleId, {
      id: sectionId,
      variant: "plain",
      fields,
      coreSlots: [...SECTION_CORE_SLOTS],
    }),
  );
}
