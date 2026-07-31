import type { Locale } from "@/i18n/config";
import type { RoadmapItem } from "@/lib/content";
import {
  cloneCoreSlots,
  normalizeCoreSlots,
} from "@/lib/core-slots";
import {
  alignExtraFields,
  cloneExtraFields,
  normalizeExtraFields,
  translateExtraFields,
} from "@/lib/extra-fields";
import {
  rememberTocPhrase,
  translateTocNote,
} from "@/lib/translate-note";
import { pushRoadmapStageToTrash } from "@/lib/trash";
import { moveIndex } from "@/lib/reorder";

const STORAGE_KEY = "knowledge-hub:roadmap-items";
export const ROADMAP_ITEMS_EVENT = "knowledge-hub:roadmap-items-updated";
export const ROADMAP_FOCUS_EDIT_EVENT = "knowledge-hub:roadmap-focus-edit";

export const ROADMAP_CORE_SLOTS = [
  "status",
  "title",
  "description",
  "topics",
] as const;
export type RoadmapCoreSlot = (typeof ROADMAP_CORE_SLOTS)[number];

/** Per-module path lists. Legacy flat `{ zh, en }` migrates into `roadmap`. */
type RoadmapStore = Record<string, Partial<Record<Locale, RoadmapItem[]>>>;

const STATUSES = new Set(["completed", "inProgress", "planned"]);

export function requestRoadmapEdit(moduleId: string, id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ROADMAP_FOCUS_EDIT_EVENT, {
      detail: { moduleId, id },
    }),
  );
}

function otherLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

function emit(moduleId: string, locale?: Locale) {
  window.dispatchEvent(
    new CustomEvent(ROADMAP_ITEMS_EVENT, {
      detail: { moduleId, locale },
    }),
  );
}

function isLocaleBucket(
  value: unknown,
): value is Partial<Record<Locale, RoadmapItem[]>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.every((key) => key === "zh" || key === "en");
}

function loadStore(): RoadmapStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as
      | RoadmapStore
      | Partial<Record<Locale, RoadmapItem[]>>;
    if (!parsed || typeof parsed !== "object") return {};

    // Legacy: flat { zh, en } at the root
    if ("zh" in parsed || "en" in parsed) {
      const legacy = parsed as Partial<Record<Locale, RoadmapItem[]>>;
      if (Array.isArray(legacy.zh) || Array.isArray(legacy.en)) {
        return { roadmap: { zh: legacy.zh, en: legacy.en } };
      }
    }

    const next: RoadmapStore = {};
    for (const [moduleId, bucket] of Object.entries(parsed)) {
      if (isLocaleBucket(bucket)) next[moduleId] = bucket;
    }
    return next;
  } catch {
    return {};
  }
}

function writeStore(store: RoadmapStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function normalizeItem(item: unknown): RoadmapItem | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Partial<RoadmapItem>;
  if (typeof row.id !== "string" || !row.id) return null;
  const status = STATUSES.has(String(row.status))
    ? (row.status as RoadmapItem["status"])
    : "planned";
  return {
    id: row.id,
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : "",
    status,
    topics: Array.isArray(row.topics)
      ? row.topics.filter((t): t is string => typeof t === "string")
      : [],
    fields: normalizeExtraFields(row.fields),
    coreSlots: normalizeCoreSlots(row.coreSlots, ROADMAP_CORE_SLOTS),
  };
}

function cloneItems(items: RoadmapItem[]): RoadmapItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    topics: [...item.topics],
    fields: cloneExtraFields(item.fields ?? []),
    coreSlots: cloneCoreSlots(item.coreSlots ?? [...ROADMAP_CORE_SLOTS]),
  }));
}

function persistLocale(
  moduleId: string,
  locale: Locale,
  items: RoadmapItem[],
) {
  const store = loadStore();
  store[moduleId] = {
    ...(store[moduleId] ?? {}),
    [locale]: cloneItems(items),
  };
  writeStore(store);
}

export function loadRoadmapItems(
  moduleId: string,
  locale: Locale,
  defaults: RoadmapItem[],
): RoadmapItem[] {
  const stored = loadStore()[moduleId]?.[locale];
  if (Array.isArray(stored)) {
    return stored
      .map(normalizeItem)
      .filter((item): item is RoadmapItem => Boolean(item));
  }
  return cloneItems(defaults);
}

function readStoredOrFallback(
  moduleId: string,
  locale: Locale,
  fallback: RoadmapItem[],
): RoadmapItem[] {
  const stored = loadStore()[moduleId]?.[locale];
  if (Array.isArray(stored)) {
    return stored
      .map(normalizeItem)
      .filter((item): item is RoadmapItem => Boolean(item));
  }
  return cloneItems(fallback);
}

function alignPeerStructure(
  sourceItems: RoadmapItem[],
  peerExisting: RoadmapItem[],
): RoadmapItem[] {
  const peerById = new Map(peerExisting.map((item) => [item.id, item]));
  return sourceItems.map((item) => {
    const prev = peerById.get(item.id);
    if (!prev) {
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        status: item.status,
        topics: [...item.topics],
        fields: cloneExtraFields(item.fields ?? []),
        coreSlots: cloneCoreSlots(item.coreSlots ?? [...ROADMAP_CORE_SLOTS]),
      };
    }
    return {
      ...prev,
      status: item.status,
      fields: alignExtraFields(item.fields ?? [], prev.fields ?? []),
      coreSlots: cloneCoreSlots(item.coreSlots ?? [...ROADMAP_CORE_SLOTS]),
    };
  });
}

function saveWithPeerStructure(
  moduleId: string,
  locale: Locale,
  items: RoadmapItem[],
  peerFallback: RoadmapItem[],
) {
  persistLocale(moduleId, locale, items);
  const peer = otherLocale(locale);
  const peerExisting = readStoredOrFallback(moduleId, peer, peerFallback);
  persistLocale(moduleId, peer, alignPeerStructure(items, peerExisting));
  emit(moduleId);
}

export function createRoadmapItem(
  moduleId: string,
  locale: Locale,
  current: RoadmapItem[],
  seed: { title: string; description: string },
  peerFallback: RoadmapItem[] = current,
): { items: RoadmapItem[]; id: string } {
  const id = `stage-${Date.now().toString(36)}`;
  const items: RoadmapItem[] = [
    ...current,
    {
      id,
      title: seed.title,
      description: seed.description,
      status: "planned",
      topics: [],
      fields: [],
      coreSlots: [...ROADMAP_CORE_SLOTS],
    },
  ];
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  void syncPeerText(moduleId, locale, id, items);
  return { items, id };
}

export function removeRoadmapItem(
  moduleId: string,
  locale: Locale,
  current: RoadmapItem[],
  itemId: string,
  peerFallback: RoadmapItem[] = current,
): RoadmapItem[] {
  const removed = current.find((item) => item.id === itemId);
  if (removed) {
    const peer = otherLocale(locale);
    const peerItems = readStoredOrFallback(moduleId, peer, peerFallback);
    const peerRemoved = peerItems.find((item) => item.id === itemId);
    pushRoadmapStageToTrash({
      moduleId,
      title: removed.title.trim() || peerRemoved?.title.trim() || itemId,
      snapshot: {
        [locale]: cloneItems([removed])[0],
        [peer]: cloneItems([peerRemoved ?? removed])[0],
      },
    });
  }
  const items = current.filter((item) => item.id !== itemId);
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  return items;
}

export function reorderRoadmapItems(
  moduleId: string,
  locale: Locale,
  current: RoadmapItem[],
  from: number,
  to: number,
  peerFallback: RoadmapItem[] = current,
): RoadmapItem[] {
  const items = moveIndex(current, from, to);
  if (items === current) return current;
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  return items;
}

export function restoreRoadmapItem(
  moduleId: string,
  snapshot: Partial<Record<Locale, RoadmapItem>>,
): boolean {
  const primary = snapshot.zh ?? snapshot.en;
  if (!primary) return false;

  const zhExisting = loadRoadmapItems(moduleId, "zh", []);
  const enExisting = loadRoadmapItems(moduleId, "en", []);
  if (
    zhExisting.some((item) => item.id === primary.id) ||
    enExisting.some((item) => item.id === primary.id)
  ) {
    return true;
  }

  const zhItem = snapshot.zh
    ? cloneItems([snapshot.zh])[0]
    : cloneItems([primary])[0];
  const enItem = snapshot.en
    ? cloneItems([snapshot.en])[0]
    : cloneItems([primary])[0];

  persistLocale(moduleId, "zh", [zhItem, ...zhExisting]);
  persistLocale(moduleId, "en", [enItem, ...enExisting]);
  emit(moduleId);
  return true;
}

export function updateRoadmapItem(
  moduleId: string,
  locale: Locale,
  current: RoadmapItem[],
  itemId: string,
  patch: Partial<Omit<RoadmapItem, "id">>,
  peerFallback: RoadmapItem[] = current,
): RoadmapItem[] {
  const items = current.map((item) =>
    item.id === itemId
      ? {
          ...item,
          ...patch,
          topics: patch.topics ? [...patch.topics] : item.topics,
          fields: patch.fields
            ? cloneExtraFields(patch.fields)
            : cloneExtraFields(item.fields ?? []),
          coreSlots: patch.coreSlots
            ? cloneCoreSlots(patch.coreSlots)
            : cloneCoreSlots(item.coreSlots ?? [...ROADMAP_CORE_SLOTS]),
        }
      : item,
  );
  saveWithPeerStructure(moduleId, locale, items, peerFallback);

  if (
    patch.title !== undefined ||
    patch.description !== undefined ||
    patch.topics !== undefined ||
    patch.fields !== undefined
  ) {
    void syncPeerText(moduleId, locale, itemId, items);
  }

  return items;
}

async function syncPeerText(
  moduleId: string,
  locale: Locale,
  itemId: string,
  sourceItems: RoadmapItem[],
) {
  const source = sourceItems.find((item) => item.id === itemId);
  if (!source) return;

  const peer = otherLocale(locale);
  const peerItems = readStoredOrFallback(moduleId, peer, sourceItems);

  const translatedTitle = source.title.trim()
    ? await translateTocNote(source.title, locale, peer)
    : "";
  const translatedDescription = source.description.trim()
    ? await translateTocNote(source.description, locale, peer)
    : "";
  const translatedTopics: string[] = [];
  for (const topic of source.topics) {
    const next = topic.trim()
      ? await translateTocNote(topic, locale, peer)
      : "";
    if (next) translatedTopics.push(next);
  }
  const translatedFields = await translateExtraFields(
    source.fields ?? [],
    locale,
    peer,
  );

  if (source.title.trim() && translatedTitle) {
    rememberTocPhrase(source.title, translatedTitle, locale);
  }
  if (source.description.trim() && translatedDescription) {
    rememberTocPhrase(source.description, translatedDescription, locale);
  }

  const nextPeer = alignPeerStructure(sourceItems, peerItems).map((item) =>
    item.id === itemId
      ? {
          ...item,
          title: translatedTitle,
          description: translatedDescription,
          status: source.status,
          topics: translatedTopics,
          fields: translatedFields,
          coreSlots: cloneCoreSlots(
            source.coreSlots ?? [...ROADMAP_CORE_SLOTS],
          ),
        }
      : item,
  );

  persistLocale(moduleId, peer, nextPeer);
  emit(moduleId, peer);
}
