import {
  parseMindMapStylePack,
  type MindMapEdgeStylePayload,
  type MindMapStylePack,
} from "./mindmap-style";
import { pushMindMapStyleToTrash } from "./trash";

const STORAGE_KEY = "knowledge-hub:mindmap-style-library";
export const MINDMAP_STYLE_LIBRARY_EVENT =
  "knowledge-hub:mindmap-style-library-updated";

export type MindMapLibraryStyle = MindMapStylePack & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MINDMAP_STYLE_LIBRARY_EVENT));
}

function normalizeLibraryItem(value: unknown): MindMapLibraryStyle | null {
  const pack = parseMindMapStylePack(value);
  if (!pack) return null;
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const now = new Date().toISOString();
  return {
    ...pack,
    id:
      typeof row.id === "string" && row.id
        ? row.id
        : `mstyle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt:
      typeof row.createdAt === "string" && row.createdAt ? row.createdAt : now,
    updatedAt:
      typeof row.updatedAt === "string" && row.updatedAt ? row.updatedAt : now,
  };
}

export function loadMindMapStyleLibrary(): MindMapLibraryStyle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeLibraryItem)
      .filter((item): item is MindMapLibraryStyle => Boolean(item))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeLibrary(items: MindMapLibraryStyle[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emit();
}

export function saveMindMapStyleToLibrary(
  pack: MindMapStylePack,
): MindMapLibraryStyle {
  const now = new Date().toISOString();
  const item: MindMapLibraryStyle = {
    ...pack,
    id: `mstyle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };
  writeLibrary([item, ...loadMindMapStyleLibrary()]);
  return item;
}

export function removeMindMapStyleFromLibrary(id: string): boolean {
  const items = loadMindMapStyleLibrary();
  const removed = items.find((item) => item.id === id);
  if (!removed) return false;
  pushMindMapStyleToTrash({
    title: removed.name || removed.id,
    style: removed,
  });
  writeLibrary(items.filter((item) => item.id !== id));
  return true;
}

export function restoreMindMapLibraryStyle(
  style: MindMapLibraryStyle,
): boolean {
  const items = loadMindMapStyleLibrary();
  if (items.some((item) => item.id === style.id)) {
    const clone: MindMapLibraryStyle = {
      ...style,
      id: `mstyle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      updatedAt: new Date().toISOString(),
    };
    writeLibrary([clone, ...items]);
    return true;
  }
  writeLibrary([
    { ...style, updatedAt: new Date().toISOString() },
    ...items,
  ]);
  return true;
}

export function libraryStyleToPayload(
  item: MindMapLibraryStyle,
): MindMapEdgeStylePayload {
  return {
    ...item.edge,
    name: item.edge.name || item.name,
    libraryId: item.id,
  };
}
