import type { BuiltinModuleId, ModuleId } from "./modules";
import {
  BUILTIN_MODULE_IDS,
  getModule,
  isBuiltinModuleId,
  modules,
  type ModuleConfig,
} from "./modules";
import {
  findTrashModule,
  pushModuleToTrash,
  removeTrashModuleByModuleId,
} from "./trash";
import {
  emptyAllTrashPermanently,
  permanentlyDeleteTrashEntry,
} from "./trash-actions";
import { getPublishedModuleLayout } from "./published-site";

const STORAGE_KEY = "knowledge-hub:module-layout";
export const MODULE_LAYOUT_EVENT = "knowledge-hub:module-layout-updated";

export type CustomModuleMeta = {
  icon: string;
};

export type ModuleLayoutState = {
  /** Ordered visible module ids (builtin + custom). */
  activeIds: string[];
  custom: Record<string, CustomModuleMeta>;
};

const CUSTOM_ICONS = ["◇", "✧", "⬡", "◈", "◎", "✦", "✺", "◉", "▣", "▲"];

function defaultState(): ModuleLayoutState {
  return {
    activeIds: modules.map((m) => m.id),
    custom: {},
  };
}

function publishedOrDefault(): ModuleLayoutState {
  const published = getPublishedModuleLayout();
  if (!published) return defaultState();
  const cleaned = published.activeIds.filter(
    (id) => isBuiltinModuleId(id) || Boolean(published.custom[id]),
  );
  return {
    activeIds: cleaned.length > 0 ? cleaned : defaultState().activeIds,
    custom: published.custom,
  };
}

function emit() {
  window.dispatchEvent(new CustomEvent(MODULE_LAYOUT_EVENT));
}

export function loadModuleLayout(): ModuleLayoutState {
  if (typeof window === "undefined") return publishedOrDefault();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return publishedOrDefault();
    const parsed = JSON.parse(raw) as Partial<ModuleLayoutState>;
    const activeIds = Array.isArray(parsed.activeIds)
      ? parsed.activeIds.filter((id): id is string => typeof id === "string")
      : publishedOrDefault().activeIds;
    const custom =
      parsed.custom && typeof parsed.custom === "object" ? parsed.custom : {};

    // Drop unknown custom refs; keep builtins even if somehow missing from catalog
    const cleaned = activeIds.filter(
      (id) => isBuiltinModuleId(id) || Boolean(custom[id]),
    );

    return {
      activeIds: cleaned.length > 0 ? cleaned : publishedOrDefault().activeIds,
      custom,
    };
  } catch {
    return publishedOrDefault();
  }
}

function writeLayout(state: ModuleLayoutState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emit();
}

export function resolveModuleConfig(id: string): ModuleConfig {
  if (isBuiltinModuleId(id)) return getModule(id);
  const layout =
    typeof window !== "undefined" ? loadModuleLayout() : null;
  const meta = layout?.custom[id];
  return {
    id: id as ModuleId,
    href: `/m/${id}`,
    color: "#b7c4ce",
    bg: "bg-white/5",
    border: "border-white/15",
    glow: "hover:shadow-white/5",
    icon: meta?.icon ?? "◇",
  };
}

export function getActiveModules(): ModuleConfig[] {
  return loadModuleLayout().activeIds.map(resolveModuleConfig);
}

export function getHiddenBuiltinIds(): BuiltinModuleId[] {
  const { activeIds } = loadModuleLayout();
  const active = new Set(activeIds);
  return BUILTIN_MODULE_IDS.filter((id) => !active.has(id));
}

export function removeActiveModule(
  id: string,
  meta?: { title?: string },
) {
  const state = loadModuleLayout();
  if (state.activeIds.length <= 1) return; // keep at least one card

  const config = resolveModuleConfig(id);
  const custom = !isBuiltinModuleId(id) ? state.custom[id] : undefined;

  pushModuleToTrash({
    moduleId: id,
    title: meta?.title?.trim() || id,
    icon: config.icon,
    custom,
  });

  state.activeIds = state.activeIds.filter((x) => x !== id);
  if (!isBuiltinModuleId(id)) {
    delete state.custom[id];
  }
  writeLayout(state);
}

export function restoreModuleFromTrash(moduleId: string): boolean {
  const state = loadModuleLayout();
  if (state.activeIds.includes(moduleId)) {
    removeTrashModuleByModuleId(moduleId);
    return true;
  }

  if (isBuiltinModuleId(moduleId)) {
    state.activeIds = [...state.activeIds, moduleId];
    writeLayout(state);
    removeTrashModuleByModuleId(moduleId);
    return true;
  }

  const trashed = findTrashModule(moduleId);
  if (!trashed?.custom) return false;

  state.custom[moduleId] = trashed.custom;
  state.activeIds = [...state.activeIds, moduleId];
  writeLayout(state);
  removeTrashModuleByModuleId(moduleId);
  return true;
}

export function permanentlyDeleteFromTrash(trashId: string) {
  permanentlyDeleteTrashEntry(trashId);
}

export function emptyTrashPermanently() {
  emptyAllTrashPermanently();
}

export function addBuiltinModule(id: BuiltinModuleId) {
  if (!isBuiltinModuleId(id)) return;
  const state = loadModuleLayout();
  if (state.activeIds.includes(id)) return;
  state.activeIds = [...state.activeIds, id];
  writeLayout(state);
  removeTrashModuleByModuleId(id);
}

export function createCustomModule(): string {
  const state = loadModuleLayout();
  const id = `custom-${Date.now().toString(36)}`;
  const icon = CUSTOM_ICONS[state.activeIds.length % CUSTOM_ICONS.length];
  state.custom[id] = { icon };
  state.activeIds = [...state.activeIds, id];
  writeLayout(state);
  return id;
}

export function isCustomModuleId(id: string) {
  return id.startsWith("custom-");
}
