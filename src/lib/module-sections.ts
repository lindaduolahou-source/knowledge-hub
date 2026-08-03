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
import {
  addSectionTombstone,
  loadSectionTombstones,
  removeSectionTombstone,
  seedTombstonesFromEntries,
  tombstonedSectionIds,
} from "./section-tombstones";
import { getTrashItems, pushSectionToTrash } from "./trash";
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

function emit(moduleId?: string) {
  window.dispatchEvent(
    new CustomEvent(
      MODULE_SECTIONS_EVENT,
      moduleId ? { detail: { moduleId } } : undefined,
    ),
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

function listModuleContentKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys = new Set<string>();
  for (const locale of locales) {
    try {
      const raw = window.localStorage.getItem(
        `knowledge-hub:module-content:${locale}`,
      );
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") continue;
      for (const key of Object.keys(parsed as Record<string, unknown>)) {
        keys.add(key);
      }
    } catch {
      // ignore corrupt locale store
    }
  }
  return [...keys];
}

/** Soft-deleted section ids still waiting in trash (must not be resurrected). */
function trashedSectionIds(moduleId: string): Set<string> {
  return new Set(
    getTrashItems().flatMap((item) =>
      item.kind === "section" && item.moduleId === moduleId
        ? [item.section.id]
        : [],
    ),
  );
}

/** Ids blocked from live layout: trash + explicit tombstones. */
function blockedSectionIds(moduleId: string): Set<string> {
  return new Set([
    ...trashedSectionIds(moduleId),
    ...tombstonedSectionIds(moduleId),
  ]);
}

/**
 * Seed tombstones from trash so emptying trash later cannot resurrect via
 * cloud pull / leftover content keys.
 */
function seedTombstonesFromTrash() {
  seedTombstonesFromEntries(
    getTrashItems().flatMap((item) =>
      item.kind === "section"
        ? [
            {
              moduleId: item.moduleId,
              sectionId: item.section.id,
              deletedAt: item.deletedAt,
            },
          ]
        : [],
    ),
  );
}

/**
 * Sync field refs onto *existing* section shells only.
 *
 * Never create new sections from orphan content keys — that recovery hack
 * resurrected deleted "新章节" whenever cloud pull restored module-content.
 */
function reconcileSectionsWithContent(
  moduleId: string,
  sections: ModuleSectionDef[],
): ModuleSectionDef[] {
  if (typeof window === "undefined") return sections;

  const contentKeys = listModuleContentKeys();
  if (contentKeys.length === 0) return sections;

  const blocked = blockedSectionIds(moduleId);
  const byId = new Map(
    sections.map((section) => [section.id, cloneSection(section)]),
  );
  let changed = false;

  for (const key of contentKeys) {
    let sectionId: string | null = null;
    let fieldId: string | null = null;

    if (moduleId === "space" && (key === "space:focus" || key === "space:skills")) {
      sectionId = key === "space:focus" ? "focus" : "skills";
    } else {
      const sectionMatch = key.match(
        new RegExp(
          `^${moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:section:([^:]+):(title|body)$`,
        ),
      );
      if (sectionMatch) {
        sectionId = sectionMatch[1];
      } else {
        const fieldMatch = key.match(
          new RegExp(
            `^${moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:section:([^:]+):field:([^:]+):(label|value)$`,
          ),
        );
        if (fieldMatch) {
          sectionId = fieldMatch[1];
          fieldId = fieldMatch[2];
        }
      }
    }

    if (!sectionId || blocked.has(sectionId)) continue;

    const section = byId.get(sectionId);
    // Do not create missing sections — layout is authoritative.
    if (!section || !fieldId) continue;

    if (!section.fields.some((field) => field.id === fieldId)) {
      section.fields = [...section.fields, { id: fieldId }];
      byId.set(sectionId, section);
      changed = true;
    }
  }

  if (!changed) return sections;

  const next = sections.map(
    (section) => byId.get(section.id) ?? section,
  );

  const store = loadStore();
  store[moduleId] = next.map(cloneSection);
  // Persist quietly — emitting during load can recurse through listeners.
  writeStore(store);
  return next;
}

function stripBlockedSections(
  moduleId: string,
  sections: ModuleSectionDef[],
): ModuleSectionDef[] {
  const blocked = blockedSectionIds(moduleId);
  if (blocked.size === 0) return sections;
  const without = sections.filter((section) => !blocked.has(section.id));
  if (without.length === sections.length) return sections;

  const nextStore = loadStore();
  nextStore[moduleId] = without.map(cloneSection);
  writeStore(nextStore);
  for (const section of sections) {
    if (!blocked.has(section.id)) continue;
    purgeModuleSectionContentById(moduleId, section.id);
  }
  return without;
}

/**
 * After cloud pull / import: remove tombstoned (and trashed) sections from the
 * live layout and purge their content keys so they cannot reappear.
 */
export function enforceSectionTombstones(): boolean {
  if (typeof window === "undefined") return false;
  seedTombstonesFromTrash();

  const store = loadStore();
  let changed = false;
  for (const moduleId of Object.keys(store)) {
    const list = store[moduleId];
    if (!Array.isArray(list)) continue;
    const sections = list
      .map(normalizeSection)
      .filter((item): item is ModuleSectionDef => Boolean(item));
    const next = stripBlockedSections(moduleId, sections);
    if (next.length !== sections.length) changed = true;
  }

  // Purge content for every tombstone even if layout already lacked the shell
  // (cloud may have restored content keys alone).
  for (const key of Object.keys(loadSectionTombstones())) {
    const split = key.indexOf(":");
    if (split <= 0) continue;
    const moduleId = key.slice(0, split);
    const sectionId = key.slice(split + 1);
    if (!moduleId || !sectionId) continue;
    purgeModuleSectionContentById(moduleId, sectionId);
  }

  if (changed) emit();
  return changed;
}

export function loadModuleSections(
  moduleId: string,
  defaults: ModuleSectionDef[],
): ModuleSectionDef[] {
  seedTombstonesFromTrash();

  const store = loadStore();
  let sections: ModuleSectionDef[] | null = null;

  if (Object.prototype.hasOwnProperty.call(store, moduleId)) {
    const stored = store[moduleId];
    if (Array.isArray(stored)) {
      sections = stored
        .map(normalizeSection)
        .filter((item): item is ModuleSectionDef => Boolean(item));
    }
  }

  if (!sections) {
    const published = getPublishedModuleSections(moduleId);
    sections = published
      ? published.map(cloneSection)
      : defaults.map(cloneSection);
  }

  sections = reconcileSectionsWithContent(moduleId, sections);
  return stripBlockedSections(moduleId, sections);
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
  // Tombstone survives trash empty / cloud pull of older rich layouts.
  addSectionTombstone(moduleId, sectionId);
  const sections = current.filter((item) => item.id !== sectionId);
  saveModuleSections(moduleId, sections);
  // Drop content keys immediately so leftover module-content cannot linger.
  // Trash already holds the text snapshot for restore.
  purgeModuleSectionContentById(moduleId, sectionId);
  return sections;
}

export function restoreModuleSection(
  moduleId: string,
  section: ModuleSectionDef,
  texts: Partial<Record<Locale, SectionLocaleTexts>>,
): boolean {
  // Clear tombstone first. Do NOT call loadModuleSections here — it seeds
  // tombstones from trash and would immediately re-block this section while
  // the trash row still exists (TrashButton removes trash after restore).
  removeSectionTombstone(moduleId, section.id);

  const store = loadStore();
  const stored = Array.isArray(store[moduleId])
    ? store[moduleId]
        .map(normalizeSection)
        .filter((item): item is ModuleSectionDef => Boolean(item))
    : [];

  const normalized = cloneSection({
    id: section.id,
    variant: section.variant,
    fields: section.fields ?? [],
    coreSlots: section.coreSlots ?? [...SECTION_CORE_SLOTS],
  });

  if (!stored.some((item) => item.id === section.id)) {
    saveModuleSections(moduleId, [...stored, normalized]);
  }

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

/** Purge all content keys for a section id (any fields), including legacy space keys. */
export function purgeModuleSectionContentById(
  moduleId: string,
  sectionId: string,
) {
  if (typeof window === "undefined") return;
  const prefix = `${moduleId}:section:${sectionId}:`;
  const keys = listModuleContentKeys().filter((key) => {
    if (key.startsWith(prefix)) return true;
    if (
      moduleId === "space" &&
      (sectionId === "focus" || sectionId === "skills") &&
      key === `space:${sectionId}`
    ) {
      return true;
    }
    return false;
  });
  // Always include canonical title/body even if currently absent.
  keys.push(
    sectionTitleKey(moduleId, sectionId),
    sectionBodyKey(moduleId, sectionId),
  );
  purgeModuleContentKeys([...new Set(keys)]);
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
  // Catch field keys not listed in `fields` (e.g. after cloud restore).
  purgeModuleSectionContentById(moduleId, sectionId);
}
