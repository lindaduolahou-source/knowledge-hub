import {
  parseMindMapTemplate,
  type MindMapTemplate,
} from "./mindmap-template";
import { pushMindMapTemplateToTrash } from "./trash";

const STORAGE_KEY = "knowledge-hub:mindmap-library";
export const MINDMAP_LIBRARY_EVENT = "knowledge-hub:mindmap-library-updated";

export type MindMapLibraryTemplate = MindMapTemplate & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MINDMAP_LIBRARY_EVENT));
}

function normalizeLibraryItem(value: unknown): MindMapLibraryTemplate | null {
  const template = parseMindMapTemplate(value);
  if (!template) return null;
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const now = new Date().toISOString();
  return {
    ...template,
    id:
      typeof row.id === "string" && row.id
        ? row.id
        : `mtpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt:
      typeof row.createdAt === "string" && row.createdAt ? row.createdAt : now,
    updatedAt:
      typeof row.updatedAt === "string" && row.updatedAt ? row.updatedAt : now,
  };
}

export function loadMindMapLibrary(): MindMapLibraryTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeLibraryItem)
      .filter((item): item is MindMapLibraryTemplate => Boolean(item))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeLibrary(items: MindMapLibraryTemplate[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emit();
}

export function saveMindMapToLibrary(
  template: MindMapTemplate,
): MindMapLibraryTemplate {
  const now = new Date().toISOString();
  const item: MindMapLibraryTemplate = {
    ...template,
    id: `mtpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };
  writeLibrary([item, ...loadMindMapLibrary()]);
  return item;
}

export function removeMindMapLibraryTemplate(id: string): boolean {
  const items = loadMindMapLibrary();
  const removed = items.find((item) => item.id === id);
  if (!removed) return false;
  pushMindMapTemplateToTrash({
    title: removed.name || removed.id,
    template: removed,
  });
  writeLibrary(items.filter((item) => item.id !== id));
  return true;
}

export function restoreMindMapLibraryTemplate(
  template: MindMapLibraryTemplate,
): boolean {
  const items = loadMindMapLibrary();
  if (items.some((item) => item.id === template.id)) {
    const clone: MindMapLibraryTemplate = {
      ...template,
      id: `mtpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      updatedAt: new Date().toISOString(),
    };
    writeLibrary([clone, ...items]);
    return true;
  }
  writeLibrary([
    { ...template, updatedAt: new Date().toISOString() },
    ...items,
  ]);
  return true;
}

export function libraryItemToMindMapTemplate(
  item: MindMapLibraryTemplate,
): MindMapTemplate {
  return {
    kind: item.kind,
    version: item.version,
    name: item.name,
    description: item.description,
    title: item.title,
    root: item.root,
  };
}
