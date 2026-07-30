import type { ModuleId } from "./modules";
import { getPublishedModuleSections } from "./published-site";

const STORAGE_KEY = "knowledge-hub:module-sections";
export const MODULE_SECTIONS_EVENT = "knowledge-hub:module-sections-updated";

export type SectionVariant = "plain" | "list" | "chips";

export type ModuleSectionDef = {
  id: string;
  variant: SectionVariant;
};

export type ModuleSectionDefault = ModuleSectionDef & {
  title: string;
  body: string;
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

export function loadModuleSections(
  moduleId: string,
  defaults: ModuleSectionDef[],
): ModuleSectionDef[] {
  const store = loadStore();
  if (Object.prototype.hasOwnProperty.call(store, moduleId)) {
    const stored = store[moduleId];
    if (Array.isArray(stored)) {
      return stored
        .filter(
          (item): item is ModuleSectionDef =>
            Boolean(item) &&
            typeof item.id === "string" &&
            (item.variant === "plain" ||
              item.variant === "list" ||
              item.variant === "chips"),
        )
        .map((item) => ({ id: item.id, variant: item.variant }));
    }
  }

  const published = getPublishedModuleSections(moduleId);
  if (published) return published.map((item) => ({ ...item }));

  return defaults.map((item) => ({ ...item }));
}

export function saveModuleSections(
  moduleId: string,
  sections: ModuleSectionDef[],
) {
  const store = loadStore();
  store[moduleId] = sections.map((item) => ({
    id: item.id,
    variant: item.variant,
  }));
  writeStore(store);
  emit(moduleId);
}

export function createModuleSection(
  moduleId: string,
  current: ModuleSectionDef[],
  variant: SectionVariant = "plain",
): { sections: ModuleSectionDef[]; id: string } {
  const id = `sec-${Date.now().toString(36)}`;
  const sections = [...current, { id, variant }];
  saveModuleSections(moduleId, sections);
  return { sections, id };
}

export function removeModuleSection(
  moduleId: string,
  current: ModuleSectionDef[],
  sectionId: string,
): ModuleSectionDef[] {
  const sections = current.filter((item) => item.id !== sectionId);
  saveModuleSections(moduleId, sections);
  return sections;
}
