import type { Locale } from "@/i18n/config";
import type { RoadmapItem } from "@/lib/content";
import type { ContactLinkDef } from "./contact-links";
import type { CustomModuleMeta } from "./module-layout";
import type { ModuleSectionDef } from "./module-sections";
import type { EditablePost, PostCollection } from "./post-edits";
import type { EditableProject } from "./project-edits";
import type { ExtraField } from "./extra-fields";
import type { MindMapDoc } from "./mindmap-edits";
import type { MindMapLibraryTemplate } from "./mindmap-library";
import type { MindMapLibraryStyle } from "./mindmap-style-library";
import type { LibraryTemplate } from "./share-card-library";
import type { VaultCard } from "./share-card-vault";

/**
 * Central soft-delete store. Any user-facing “delete / remove” of a first-class
 * item (module, section, project, post, roadmap stage, contact, vault card,
 * card template, field/栏目, …) should `push*ToTrash` here before removing from
 * its store, and restore via `trash-actions.ts`.
 */
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

export type TrashVaultCardItem = {
  id: string;
  kind: "vault-card";
  title: string;
  card: VaultCard;
  deletedAt: number;
};

export type TrashCardTemplateItem = {
  id: string;
  kind: "card-template";
  title: string;
  template: LibraryTemplate;
  deletedAt: number;
};

export type TrashMindMapTemplateItem = {
  id: string;
  kind: "mindmap-template";
  title: string;
  template: MindMapLibraryTemplate;
  deletedAt: number;
};

export type TrashMindMapStyleItem = {
  id: string;
  kind: "mindmap-style";
  title: string;
  style: MindMapLibraryStyle;
  deletedAt: number;
};

export type FieldParent =
  | { scope: "project"; moduleId: string; slug: string }
  | { scope: "post"; collection: PostCollection; slug: string }
  | { scope: "roadmap"; moduleId: string; stageId: string }
  | { scope: "section"; moduleId: string; sectionId: string }
  | { scope: "contact"; linkId: string };

export type TrashFieldPayload =
  | { type: "extra"; field: ExtraField }
  | { type: "core"; slot: string }
  | {
      type: "section-field";
      fieldId: string;
      texts: Partial<Record<Locale, { label: string; value: string }>>;
    }
  | {
      type: "contact-field";
      fieldId: string;
      texts: Partial<Record<Locale, { label: string; value: string }>>;
    };

export type TrashFieldItem = {
  id: string;
  kind: "field";
  title: string;
  parent: FieldParent;
  payload: TrashFieldPayload;
  deletedAt: number;
};

export type TrashMindMapItem = {
  id: string;
  kind: "mindmap";
  moduleId: string;
  title: string;
  snapshot: Partial<Record<Locale, MindMapDoc>>;
  deletedAt: number;
};

export type TrashItem =
  | TrashModuleItem
  | TrashSectionItem
  | TrashProjectItem
  | TrashPostItem
  | TrashRoadmapStageItem
  | TrashContactItem
  | TrashVaultCardItem
  | TrashCardTemplateItem
  | TrashMindMapTemplateItem
  | TrashMindMapStyleItem
  | TrashFieldItem
  | TrashMindMapItem;

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
    case "vault-card":
      return isRecord(value.card) && typeof value.card.id === "string";
    case "card-template":
    case "mindmap-template":
      return (
        isRecord(value.template) && typeof value.template.id === "string"
      );
    case "mindmap-style":
      return isRecord(value.style) && typeof value.style.id === "string";
    case "field":
      return isRecord(value.parent) && isRecord(value.payload);
    case "mindmap":
      return typeof value.moduleId === "string" && isRecord(value.snapshot);
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

export function pushVaultCardToTrash(input: {
  title: string;
  card: VaultCard;
}): TrashVaultCardItem {
  return prependItem({
    id: newTrashId(),
    kind: "vault-card",
    title: input.title.trim() || input.card.name || input.card.id,
    card: input.card,
    deletedAt: Date.now(),
  }) as TrashVaultCardItem;
}

export function pushCardTemplateToTrash(input: {
  title: string;
  template: LibraryTemplate;
}): TrashCardTemplateItem {
  return prependItem({
    id: newTrashId(),
    kind: "card-template",
    title: input.title.trim() || input.template.name || input.template.id,
    template: input.template,
    deletedAt: Date.now(),
  }) as TrashCardTemplateItem;
}

export function pushMindMapTemplateToTrash(input: {
  title: string;
  template: MindMapLibraryTemplate;
}): TrashMindMapTemplateItem {
  return prependItem({
    id: newTrashId(),
    kind: "mindmap-template",
    title: input.title.trim() || input.template.name || input.template.id,
    template: input.template,
    deletedAt: Date.now(),
  }) as TrashMindMapTemplateItem;
}

export function pushMindMapStyleToTrash(input: {
  title: string;
  style: MindMapLibraryStyle;
}): TrashMindMapStyleItem {
  return prependItem({
    id: newTrashId(),
    kind: "mindmap-style",
    title: input.title.trim() || input.style.name || input.style.id,
    style: input.style,
    deletedAt: Date.now(),
  }) as TrashMindMapStyleItem;
}

export function pushFieldToTrash(input: {
  title: string;
  parent: FieldParent;
  payload: TrashFieldPayload;
}): TrashFieldItem {
  return prependItem({
    id: newTrashId(),
    kind: "field",
    title: input.title.trim() || "field",
    parent: input.parent,
    payload: input.payload,
    deletedAt: Date.now(),
  }) as TrashFieldItem;
}

export function pushMindMapToTrash(input: {
  moduleId: string;
  title: string;
  snapshot: Partial<Record<Locale, MindMapDoc>>;
}): TrashMindMapItem {
  return prependItem({
    id: newTrashId(),
    kind: "mindmap",
    moduleId: input.moduleId,
    title: input.title.trim() || "mindmap",
    snapshot: input.snapshot,
    deletedAt: Date.now(),
  }) as TrashMindMapItem;
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
