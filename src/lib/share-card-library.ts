import {
  parseShareCardTemplate,
  type ShareCardTemplate,
  vaultCardToTemplate,
} from "./share-card-template";
import type { VaultCard } from "./share-card-vault";
import { pushCardTemplateToTrash } from "./trash";

const STORAGE_KEY = "knowledge-hub:share-card-library";
export const SHARE_CARD_LIBRARY_EVENT =
  "knowledge-hub:share-card-library-updated";

export type LibraryTemplate = ShareCardTemplate & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SHARE_CARD_LIBRARY_EVENT));
}

function normalizeLibraryItem(value: unknown): LibraryTemplate | null {
  const template = parseShareCardTemplate(value);
  if (!template) return null;
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const now = new Date().toISOString();
  return {
    ...template,
    id:
      typeof row.id === "string" && row.id
        ? row.id
        : `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt:
      typeof row.createdAt === "string" && row.createdAt ? row.createdAt : now,
    updatedAt:
      typeof row.updatedAt === "string" && row.updatedAt ? row.updatedAt : now,
  };
}

export function loadLibraryTemplates(): LibraryTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeLibraryItem)
      .filter((item): item is LibraryTemplate => Boolean(item))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeLibrary(items: LibraryTemplate[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emit();
}

export function saveTemplateToLibrary(
  template: ShareCardTemplate,
): LibraryTemplate {
  const now = new Date().toISOString();
  const item: LibraryTemplate = {
    ...template,
    id: `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };
  writeLibrary([item, ...loadLibraryTemplates()]);
  return item;
}

export function saveVaultCardToLibrary(card: VaultCard): LibraryTemplate {
  return saveTemplateToLibrary(vaultCardToTemplate(card));
}

export function removeLibraryTemplate(id: string): boolean {
  const items = loadLibraryTemplates();
  const removed = items.find((item) => item.id === id);
  if (!removed) return false;
  pushCardTemplateToTrash({
    title: removed.name || removed.id,
    template: removed,
  });
  writeLibrary(items.filter((item) => item.id !== id));
  return true;
}

/** Restore a personal template from trash (keeps original id when free). */
export function restoreLibraryTemplate(template: LibraryTemplate): boolean {
  const items = loadLibraryTemplates();
  if (items.some((item) => item.id === template.id)) {
    const clone: LibraryTemplate = {
      ...template,
      id: `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
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

export function libraryItemToTemplate(item: LibraryTemplate): ShareCardTemplate {
  return {
    kind: item.kind,
    version: item.version,
    name: item.name,
    description: item.description,
    moduleId: item.moduleId,
    moduleIcon: item.moduleIcon,
    draft: item.draft,
  };
}
