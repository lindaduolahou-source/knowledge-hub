import { moveIndex } from "./reorder";

const STORAGE_KEY = "knowledge-hub:module-page-blocks";
export const MODULE_PAGE_BLOCKS_EVENT =
  "knowledge-hub:module-page-blocks-updated";

export type ModulePageBlockKind =
  | "intro"
  | "contact"
  | "sections"
  | "projects"
  | "path"
  | "mindmap"
  | "posts";

const ALL_KINDS: ModulePageBlockKind[] = [
  "intro",
  "contact",
  "sections",
  "projects",
  "path",
  "mindmap",
  "posts",
];

type Store = Record<string, ModulePageBlockKind[]>;

function emit(moduleId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MODULE_PAGE_BLOCKS_EVENT, {
      detail: moduleId ? { moduleId } : undefined,
    }),
  );
}

function isBlockKind(value: unknown): value is ModulePageBlockKind {
  return typeof value === "string" && (ALL_KINDS as string[]).includes(value);
}

/** One default order for every module (builtin + custom). */
export function defaultModulePageBlocks(
  _moduleId: string,
): ModulePageBlockKind[] {
  return [
    "intro",
    "contact",
    "sections",
    "projects",
    "path",
    "mindmap",
    "posts",
  ];
}

function allowedKinds(moduleId: string): ModulePageBlockKind[] {
  const defaults = defaultModulePageBlocks(moduleId);
  return defaults;
}

function normalizeOrder(
  moduleId: string,
  order: ModulePageBlockKind[],
): ModulePageBlockKind[] {
  const allowed = new Set(allowedKinds(moduleId));
  const seen = new Set<ModulePageBlockKind>();
  const next: ModulePageBlockKind[] = [];
  for (const kind of order) {
    if (!allowed.has(kind) || seen.has(kind)) continue;
    seen.add(kind);
    next.push(kind);
  }
  for (const kind of allowedKinds(moduleId)) {
    if (!seen.has(kind)) next.push(kind);
  }
  return next;
}

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const store: Store = {};
    for (const [moduleId, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!Array.isArray(value)) continue;
      store[moduleId] = value.filter(isBlockKind);
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: Store, moduleId?: string) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  emit(moduleId);
}

export function loadModulePageBlocks(moduleId: string): ModulePageBlockKind[] {
  const stored = loadStore()[moduleId];
  return normalizeOrder(moduleId, stored ?? defaultModulePageBlocks(moduleId));
}

export function reorderModulePageBlocks(
  moduleId: string,
  from: number,
  to: number,
): ModulePageBlockKind[] {
  const current = loadModulePageBlocks(moduleId);
  const next = normalizeOrder(moduleId, moveIndex(current, from, to));
  if (next.every((kind, i) => kind === current[i])) return current;
  const store = loadStore();
  store[moduleId] = next;
  writeStore(store, moduleId);
  return next;
}

/**
 * Reorder among a visible subset (blocks that currently have content),
 * while keeping empty blocks parked in their relative slots.
 */
export function reorderVisibleModulePageBlocks(
  moduleId: string,
  visible: ModulePageBlockKind[],
  from: number,
  to: number,
): ModulePageBlockKind[] {
  const current = loadModulePageBlocks(moduleId);
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= visible.length ||
    to >= visible.length
  ) {
    return current;
  }
  const reorderedVisible = moveIndex(visible, from, to);
  let cursor = 0;
  const next = current.map((kind) =>
    visible.includes(kind) ? reorderedVisible[cursor++] : kind,
  );
  const normalized = normalizeOrder(moduleId, next);
  if (normalized.every((kind, i) => kind === current[i])) return current;
  const store = loadStore();
  store[moduleId] = normalized;
  writeStore(store, moduleId);
  return normalized;
}
