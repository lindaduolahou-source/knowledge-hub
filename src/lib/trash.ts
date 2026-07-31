import type { Locale } from "@/i18n/config";
import type { RoadmapItem } from "@/lib/content";
import type { ContactLinkDef } from "./contact-links";
import type { CustomModuleMeta } from "./module-layout";
import type { ModuleSectionDef } from "./module-sections";
import type { EditablePost, PostCollection } from "./post-edits";
import type { EditableProject } from "./project-edits";

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

export type TrashSectionItem = {
  id: string;
  kind: "section";
  moduleId: string;
  title: string;
  section: ModuleSectionDef;
  texts: Partial<
    Record<
      Locale,
      {
        title: string;
        body: string;
        fields?: Record<string, { label: string; value: string }>;
      }
    >
  >;
  deletedAt: number;
};

export type TrashProjectItem = {
  id: string;
  kind: "project";
  moduleId: string;
  title: string;
  snapshot: Partial<Record<Locale, EditableProject>>;
  deletedAt: number;
};

export type TrashPostItem = {
  id: string;
  kind: "post";
  collection: PostCollection;
  title: string;
  snapshot: Partial<Record<Locale, EditablePost>>;
  deletedAt: number;
};

export type TrashRoadmapStageItem = {
  id: string;
  kind: "roadmap";
  moduleId: string;
  title: string;
  snapshot: Partial<Record<Locale, RoadmapItem>>;
  deletedAt: number;
};

export type TrashContactItem = {
  id: string;
  kind: "contact";
  title: string;
  link: ContactLinkDef;
  texts: Partial<
    Record<
      Locale,
      {
        label: string;
        value: string;
        fields?: Record<string, { label: string; value: string }>;
      }
    >
  >;
  deletedAt: number;
};

export type TrashItem =
  | TrashModuleItem
  | TrashSectionItem
  | TrashProjectItem
  | TrashPostItem
  | TrashRoadmapStageItem
  | TrashContactItem;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isTrashItem(value: unknown): value is TrashItem {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.deletedAt !== "number") {
    return false;
  }
  if (typeof value.title !== "string") return false;

  switch (value.kind) {
    case "module":
      return typeof value.moduleId === "string";
    case "section":
      return (
        typeof value.moduleId === "string" &&
        isRecord(value.section) &&
        typeof value.section.id === "string"
      );
    case "project":
      return typeof value.moduleId === "string" && isRecord(value.snapshot);
    case "post":
      return typeof value.collection === "string" && isRecord(value.snapshot);
    case "roadmap":
      return typeof value.moduleId === "string" && isRecord(value.snapshot);
    case "contact":
      return isRecord(value.link) && typeof value.link.id === "string";
    default:
      return false;
  }
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
        ? obj.dismissedBuiltins.filter(
            (id): id is string => typeof id === "string",
          )
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

function newTrashId() {
  return `trash-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function prependItem(entry: TrashItem) {
  const state = loadState();
  writeState({
    items: [entry, ...state.items],
    dismissedBuiltins: state.dismissedBuiltins,
  });
  return entry;
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
    id: newTrashId(),
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

export function pushSectionToTrash(input: {
  moduleId: string;
  title: string;
  section: ModuleSectionDef;
  texts: Partial<
    Record<
      Locale,
      {
        title: string;
        body: string;
        fields?: Record<string, { label: string; value: string }>;
      }
    >
  >;
}): TrashSectionItem {
  return prependItem({
    id: newTrashId(),
    kind: "section",
    moduleId: input.moduleId,
    title: input.title.trim() || input.section.id,
    section: {
      id: input.section.id,
      variant: input.section.variant,
      fields: (input.section.fields ?? []).map((field) => ({ id: field.id })),
      coreSlots: [...(input.section.coreSlots ?? ["title", "body"])],
    },
    texts: input.texts,
    deletedAt: Date.now(),
  }) as TrashSectionItem;
}

export function pushProjectToTrash(input: {
  moduleId: string;
  title: string;
  snapshot: Partial<Record<Locale, EditableProject>>;
}): TrashProjectItem {
  return prependItem({
    id: newTrashId(),
    kind: "project",
    moduleId: input.moduleId,
    title: input.title.trim() || "project",
    snapshot: input.snapshot,
    deletedAt: Date.now(),
  }) as TrashProjectItem;
}

export function pushPostToTrash(input: {
  collection: PostCollection;
  title: string;
  snapshot: Partial<Record<Locale, EditablePost>>;
}): TrashPostItem {
  return prependItem({
    id: newTrashId(),
    kind: "post",
    collection: input.collection,
    title: input.title.trim() || "post",
    snapshot: input.snapshot,
    deletedAt: Date.now(),
  }) as TrashPostItem;
}

export function pushRoadmapStageToTrash(input: {
  moduleId: string;
  title: string;
  snapshot: Partial<Record<Locale, RoadmapItem>>;
}): TrashRoadmapStageItem {
  return prependItem({
    id: newTrashId(),
    kind: "roadmap",
    moduleId: input.moduleId,
    title: input.title.trim() || "stage",
    snapshot: input.snapshot,
    deletedAt: Date.now(),
  }) as TrashRoadmapStageItem;
}

export function pushContactToTrash(input: {
  title: string;
  link: ContactLinkDef;
  texts: Partial<
    Record<
      Locale,
      {
        label: string;
        value: string;
        fields?: Record<string, { label: string; value: string }>;
      }
    >
  >;
}): TrashContactItem {
  return prependItem({
    id: newTrashId(),
    kind: "contact",
    title: input.title.trim() || input.link.id,
    link: {
      id: input.link.id,
      kind: input.link.kind,
      fields: (input.link.fields ?? []).map((field) => ({ id: field.id })),
      coreSlots: [...(input.link.coreSlots ?? ["label", "value"])],
    },
    texts: input.texts,
    deletedAt: Date.now(),
  }) as TrashContactItem;
}

export function removeTrashItem(
  id: string,
  options?: { dismissBuiltin?: boolean },
) {
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
      .filter(
        (item): item is TrashModuleItem =>
          item.kind === "module" && !item.custom,
      )
      .map((item) => item.moduleId);
    dismissedBuiltins = Array.from(new Set([...dismissedBuiltins, ...extra]));
  }
  writeState({ items: [], dismissedBuiltins });
}
