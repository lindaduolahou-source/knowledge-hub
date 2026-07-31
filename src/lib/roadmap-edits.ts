import type { Locale } from "@/i18n/config";
import type { RoadmapItem } from "@/lib/content";
import {
  rememberTocPhrase,
  translateTocNote,
} from "@/lib/translate-note";
import { pushRoadmapStageToTrash } from "@/lib/trash";

const STORAGE_KEY = "knowledge-hub:roadmap-items";
export const ROADMAP_ITEMS_EVENT = "knowledge-hub:roadmap-items-updated";
export const ROADMAP_FOCUS_EDIT_EVENT = "knowledge-hub:roadmap-focus-edit";

export function requestRoadmapEdit(id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ROADMAP_FOCUS_EDIT_EVENT, {
      detail: { id },
    }),
  );
}

type RoadmapStore = Partial<Record<Locale, RoadmapItem[]>>;

const STATUSES = new Set(["completed", "inProgress", "planned"]);

function otherLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

function emit(locale?: Locale) {
  window.dispatchEvent(
    new CustomEvent(ROADMAP_ITEMS_EVENT, { detail: { locale } }),
  );
}

function loadStore(): RoadmapStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RoadmapStore;
    return parsed && typeof parsed === "object" ? parsed : {};
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
  };
}

function cloneItems(items: RoadmapItem[]): RoadmapItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    topics: [...item.topics],
  }));
}

function persistLocale(locale: Locale, items: RoadmapItem[]) {
  const store = loadStore();
  store[locale] = cloneItems(items);
  writeStore(store);
}

export function loadRoadmapItems(
  locale: Locale,
  defaults: RoadmapItem[],
): RoadmapItem[] {
  const stored = loadStore()[locale];
  if (Array.isArray(stored)) {
    return stored
      .map(normalizeItem)
      .filter((item): item is RoadmapItem => Boolean(item));
  }
  return cloneItems(defaults);
}

function readStoredOrFallback(
  locale: Locale,
  fallback: RoadmapItem[],
): RoadmapItem[] {
  const stored = loadStore()[locale];
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
      };
    }
    return {
      ...prev,
      status: item.status,
    };
  });
}

function saveWithPeerStructure(
  locale: Locale,
  items: RoadmapItem[],
  peerFallback: RoadmapItem[],
) {
  persistLocale(locale, items);
  const peer = otherLocale(locale);
  const peerExisting = readStoredOrFallback(peer, peerFallback);
  persistLocale(peer, alignPeerStructure(items, peerExisting));
  emit();
}

export function createRoadmapItem(
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
    },
  ];
  saveWithPeerStructure(locale, items, peerFallback);
  void syncPeerText(locale, id, items);
  return { items, id };
}

export function removeRoadmapItem(
  locale: Locale,
  current: RoadmapItem[],
  itemId: string,
  peerFallback: RoadmapItem[] = current,
): RoadmapItem[] {
  const removed = current.find((item) => item.id === itemId);
  if (removed) {
    const peer = otherLocale(locale);
    const peerItems = readStoredOrFallback(peer, peerFallback);
    const peerRemoved = peerItems.find((item) => item.id === itemId);
    pushRoadmapStageToTrash({
      title: removed.title.trim() || peerRemoved?.title.trim() || itemId,
      snapshot: {
        [locale]: cloneItems([removed])[0],
        [peer]: cloneItems([peerRemoved ?? removed])[0],
      },
    });
  }
  const items = current.filter((item) => item.id !== itemId);
  saveWithPeerStructure(locale, items, peerFallback);
  return items;
}

export function restoreRoadmapItem(
  snapshot: Partial<Record<Locale, RoadmapItem>>,
): boolean {
  const primary = snapshot.zh ?? snapshot.en;
  if (!primary) return false;

  const zhExisting = loadRoadmapItems("zh", []);
  const enExisting = loadRoadmapItems("en", []);
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

  persistLocale("zh", [zhItem, ...zhExisting]);
  persistLocale("en", [enItem, ...enExisting]);
  emit();
  return true;
}

export function updateRoadmapItem(
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
        }
      : item,
  );
  saveWithPeerStructure(locale, items, peerFallback);

  if (
    patch.title !== undefined ||
    patch.description !== undefined ||
    patch.topics !== undefined
  ) {
    void syncPeerText(locale, itemId, items);
  }

  return items;
}

async function syncPeerText(
  locale: Locale,
  itemId: string,
  sourceItems: RoadmapItem[],
) {
  const source = sourceItems.find((item) => item.id === itemId);
  if (!source) return;

  const peer = otherLocale(locale);
  const peerItems = readStoredOrFallback(peer, sourceItems);

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
        }
      : item,
  );

  persistLocale(peer, nextPeer);
  emit(peer);
}
