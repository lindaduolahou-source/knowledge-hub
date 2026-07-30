import type { CustomModuleMeta } from "./module-layout";

const STORAGE_KEY = "knowledge-hub:trash";
export const TRASH_EVENT = "knowledge-hub:trash-updated";

export type TrashModuleItem = {
  id: string;
  kind: "module";
  moduleId: string;
  title: string;
  icon?: string;
  /** Preserved so custom modules can be restored. */
  custom?: CustomModuleMeta;
  deletedAt: number;
};

export type TrashItem = TrashModuleItem;

type TrashState = {
  items: TrashItem[];
  /** Builtins removed from trash without restoring — skip auto-migrate. */
  dismissedBuiltins: string[];
};

function emit() {
  window.dispatchEvent(new CustomEvent(TRASH_EVENT));
}

function defaultState(): TrashState {
  return { items: [], dismissedBuiltins: [] };
}

function isTrashItem(value: unknown): value is TrashItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    item.kind === "module" &&
    typeof item.id === "string" &&
    typeof item.moduleId === "string" &&
    typeof item.title === "string" &&
    typeof item.deletedAt === "number"
  );
}

function loadState(): TrashState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as unknown;

    // Legacy: bare array
    if (Array.isArray(parsed)) {
      return {
        items: parsed.filter(isTrashItem),
        dismissedBuiltins: [],
      };
    }

    if (!parsed || typeof parsed !== "object") return defaultState();
    const obj = parsed as Partial<TrashState>;
    return {
      items: Array.isArray(obj.items) ? obj.items.filter(isTrashItem) : [],
      dismissedBuiltins: Array.isArray(obj.dismissedBuiltins)
        ? obj.dismissedBuiltins.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return defaultState();
  }
}

function writeState(state: TrashState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emit();
}

export function loadTrash(): TrashItem[] {
  return loadState().items;
}

export function getTrashItems(): TrashItem[] {
  return loadTrash().sort((a, b) => b.deletedAt - a.deletedAt);
}

export function isDismissedBuiltin(moduleId: string): boolean {
  return loadState().dismissedBuiltins.includes(moduleId);
}

export function findTrashModule(moduleId: string): TrashModuleItem | undefined {
  return loadTrash().find(
    (item): item is TrashModuleItem =>
      item.kind === "module" && item.moduleId === moduleId,
  );
}

export function pushModuleToTrash(input: {
  moduleId: string;
  title: string;
  icon?: string;
  custom?: CustomModuleMeta;
}): TrashModuleItem {
  const state = loadState();
  const items = state.items.filter(
    (item) => !(item.kind === "module" && item.moduleId === input.moduleId),
  );
  const entry: TrashModuleItem = {
    id: `trash-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "module",
    moduleId: input.moduleId,
    title: input.title.trim() || input.moduleId,
    icon: input.icon,
    custom: input.custom,
    deletedAt: Date.now(),
  };
  writeState({
    items: [entry, ...items],
    dismissedBuiltins: state.dismissedBuiltins.filter(
      (id) => id !== input.moduleId,
    ),
  });
  return entry;
}

export function removeTrashItem(id: string, options?: { dismissBuiltin?: boolean }) {
  const state = loadState();
  const target = state.items.find((item) => item.id === id);
  const items = state.items.filter((item) => item.id !== id);
  let dismissedBuiltins = state.dismissedBuiltins;
  if (
    options?.dismissBuiltin &&
    target?.kind === "module" &&
    !target.custom
  ) {
    if (!dismissedBuiltins.includes(target.moduleId)) {
      dismissedBuiltins = [...dismissedBuiltins, target.moduleId];
    }
  }
  writeState({ items, dismissedBuiltins });
}

export function removeTrashModuleByModuleId(moduleId: string) {
  const state = loadState();
  writeState({
    items: state.items.filter(
      (item) => !(item.kind === "module" && item.moduleId === moduleId),
    ),
    dismissedBuiltins: state.dismissedBuiltins.filter((id) => id !== moduleId),
  });
}

export function clearTrash(options?: { dismissRemainingBuiltins?: boolean }) {
  const state = loadState();
  let dismissedBuiltins = state.dismissedBuiltins;
  if (options?.dismissRemainingBuiltins) {
    const extra = state.items
      .filter((item) => item.kind === "module" && !item.custom)
      .map((item) => item.moduleId);
    dismissedBuiltins = Array.from(new Set([...dismissedBuiltins, ...extra]));
  }
  writeState({ items: [], dismissedBuiltins });
}
