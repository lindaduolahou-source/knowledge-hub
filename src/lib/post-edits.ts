import type { Locale } from "@/i18n/config";
import type { Post, PostMeta } from "@/lib/content";
import {
  cloneCoreSlots,
  normalizeCoreSlots,
} from "@/lib/core-slots";
import {
  alignExtraFields,
  cloneExtraFields,
  normalizeExtraFields,
  translateExtraFields,
  type ExtraField,
} from "@/lib/extra-fields";
import {
  rememberTocPhrase,
  translateTocNote,
} from "@/lib/translate-note";
import { pushPostToTrash } from "@/lib/trash";
import { moveIndex } from "@/lib/reorder";

export const POST_CORE_SLOTS = [
  "date",
  "title",
  "excerpt",
  "tags",
  "content",
] as const;
export type PostCoreSlot = (typeof POST_CORE_SLOTS)[number];

export type PostCollection = string;

/** Builtin knowledge/thoughts keep legacy storage keys. */
export function postCollectionForModule(moduleId: string): PostCollection {
  if (moduleId === "knowledge") return "blog";
  if (moduleId === "thoughts") return "thoughts";
  return moduleId;
}

/** Path under /[locale]/ for article detail links (no leading slash). */
export function postHrefPrefixForModule(moduleId: string): string {
  if (moduleId === "knowledge") return "blog";
  if (moduleId === "thoughts") return "thoughts";
  return `a/${moduleId}`;
}

/** Module list page path for “back” from an article. */
export function modulePageHref(locale: string, moduleId: string): string {
  if (moduleId === "knowledge") return `/${locale}/blog`;
  if (moduleId === "thoughts") return `/${locale}/thoughts`;
  if (moduleId === "lab") return `/${locale}/projects`;
  if (moduleId.startsWith("custom-")) return `/${locale}/m/${moduleId}`;
  return `/${locale}/${moduleId}`;
}

const STORAGE_KEY = "knowledge-hub:post-items";
export const POST_ITEMS_EVENT = "knowledge-hub:post-items-updated";
export const POST_FOCUS_EDIT_EVENT = "knowledge-hub:post-focus-edit";

export function requestPostEdit(collection: PostCollection, slug: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(POST_FOCUS_EDIT_EVENT, {
      detail: { collection, slug },
    }),
  );
}

export type EditablePost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  content: string;
  fields: ExtraField[];
  /** Built-in date/title/excerpt/tags/content slots still shown. */
  coreSlots: PostCoreSlot[];
};

type PostStore = Record<string, Partial<Record<Locale, EditablePost[]>>>;

function otherLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

function emit(collection: PostCollection, locale?: Locale) {
  window.dispatchEvent(
    new CustomEvent(POST_ITEMS_EVENT, {
      detail: { collection, locale },
    }),
  );
}

function loadStore(): PostStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PostStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: PostStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function normalizeItem(item: unknown): EditablePost | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Partial<EditablePost>;
  if (typeof row.slug !== "string" || !row.slug) return null;
  return {
    slug: row.slug,
    title: typeof row.title === "string" ? row.title : "",
    date:
      typeof row.date === "string" && row.date
        ? row.date
        : new Date().toISOString().slice(0, 10),
    excerpt: typeof row.excerpt === "string" ? row.excerpt : "",
    tags: Array.isArray(row.tags)
      ? row.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    content: typeof row.content === "string" ? row.content : "",
    fields: normalizeExtraFields(row.fields),
    coreSlots: normalizeCoreSlots(row.coreSlots, POST_CORE_SLOTS),
  };
}

function cloneItems(items: EditablePost[]): EditablePost[] {
  return items.map((item) => ({
    ...item,
    tags: [...item.tags],
    fields: cloneExtraFields(item.fields),
    coreSlots: cloneCoreSlots(item.coreSlots ?? [...POST_CORE_SLOTS]),
  }));
}

export function postFromMeta(
  post: PostMeta,
  content = "",
): EditablePost {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    excerpt: post.excerpt,
    tags: [...post.tags],
    content,
    fields: [],
    coreSlots: [...POST_CORE_SLOTS],
  };
}

export function postFromContent(post: Post): EditablePost {
  return postFromMeta(post, post.content);
}

function persistLocale(
  collection: PostCollection,
  locale: Locale,
  items: EditablePost[],
) {
  const store = loadStore();
  store[collection] = {
    ...(store[collection] ?? {}),
    [locale]: cloneItems(items),
  };
  writeStore(store);
}

export function loadPostItems(
  collection: PostCollection,
  locale: Locale,
  defaults: EditablePost[],
): EditablePost[] {
  const stored = loadStore()[collection]?.[locale];
  if (Array.isArray(stored)) {
    return stored
      .map(normalizeItem)
      .filter((item): item is EditablePost => Boolean(item));
  }
  return cloneItems(defaults);
}

export function findEditablePost(
  collection: PostCollection,
  locale: Locale,
  slug: string,
  fallback: EditablePost | null,
): EditablePost | null {
  const items = loadPostItems(
    collection,
    locale,
    fallback ? [fallback] : [],
  );
  const found = items.find((item) => item.slug === slug);
  if (!found) return fallback;
  if ((!found.content || !found.content.trim()) && fallback?.content) {
    return { ...found, content: fallback.content };
  }
  return found;
}

function readStoredOrFallback(
  collection: PostCollection,
  locale: Locale,
  fallback: EditablePost[],
): EditablePost[] {
  const stored = loadStore()[collection]?.[locale];
  if (Array.isArray(stored)) {
    return stored
      .map(normalizeItem)
      .filter((item): item is EditablePost => Boolean(item));
  }
  return cloneItems(fallback);
}

function alignPeerStructure(
  sourceItems: EditablePost[],
  peerExisting: EditablePost[],
): EditablePost[] {
  const peerBySlug = new Map(peerExisting.map((item) => [item.slug, item]));
  return sourceItems.map((item) => {
    const prev = peerBySlug.get(item.slug);
    if (!prev) {
      return {
        ...item,
        tags: [...item.tags],
        fields: cloneExtraFields(item.fields),
        coreSlots: cloneCoreSlots(item.coreSlots ?? [...POST_CORE_SLOTS]),
      };
    }
    return {
      ...prev,
      date: item.date,
      fields: alignExtraFields(item.fields, prev.fields),
      coreSlots: cloneCoreSlots(item.coreSlots ?? [...POST_CORE_SLOTS]),
    };
  });
}

function saveWithPeerStructure(
  collection: PostCollection,
  locale: Locale,
  items: EditablePost[],
  peerFallback: EditablePost[],
) {
  persistLocale(collection, locale, items);
  const peer = otherLocale(locale);
  const peerExisting = readStoredOrFallback(collection, peer, peerFallback);
  persistLocale(collection, peer, alignPeerStructure(items, peerExisting));
  emit(collection);
}

export function createPostItem(
  collection: PostCollection,
  locale: Locale,
  current: EditablePost[],
  seed: { title: string; excerpt: string; content: string },
  peerFallback: EditablePost[] = current,
): { items: EditablePost[]; slug: string } {
  const slug = `post-${Date.now().toString(36)}`;
  const items: EditablePost[] = [
    ...current,
    {
      slug,
      title: seed.title,
      date: new Date().toISOString().slice(0, 10),
      excerpt: seed.excerpt,
      tags: [],
      content: seed.content,
      fields: [],
      coreSlots: [...POST_CORE_SLOTS],
    },
  ];
  saveWithPeerStructure(collection, locale, items, peerFallback);
  void syncPeerText(collection, locale, slug, items);
  return { items, slug };
}

export function removePostItem(
  collection: PostCollection,
  locale: Locale,
  current: EditablePost[],
  slug: string,
  peerFallback: EditablePost[] = current,
): EditablePost[] {
  const removed = current.find((item) => item.slug === slug);
  if (removed) {
    const peer = otherLocale(locale);
    const peerItems = readStoredOrFallback(collection, peer, peerFallback);
    const peerRemoved = peerItems.find((item) => item.slug === slug);
    pushPostToTrash({
      collection,
      title: removed.title.trim() || peerRemoved?.title.trim() || slug,
      snapshot: {
        [locale]: cloneItems([removed])[0],
        [peer]: cloneItems([peerRemoved ?? removed])[0],
      },
    });
  }
  const items = current.filter((item) => item.slug !== slug);
  saveWithPeerStructure(collection, locale, items, peerFallback);
  return items;
}

export function reorderPostItems(
  collection: PostCollection,
  locale: Locale,
  current: EditablePost[],
  from: number,
  to: number,
  peerFallback: EditablePost[] = current,
): EditablePost[] {
  const items = moveIndex(current, from, to);
  if (items === current) return current;
  saveWithPeerStructure(collection, locale, items, peerFallback);
  return items;
}

export function restorePostItem(
  collection: PostCollection,
  snapshot: Partial<Record<Locale, EditablePost>>,
): boolean {
  const primary = snapshot.zh ?? snapshot.en;
  if (!primary) return false;

  const zhExisting = loadPostItems(collection, "zh", []);
  const enExisting = loadPostItems(collection, "en", []);
  if (
    zhExisting.some((item) => item.slug === primary.slug) ||
    enExisting.some((item) => item.slug === primary.slug)
  ) {
    return true;
  }

  const zhItem = snapshot.zh
    ? cloneItems([snapshot.zh])[0]
    : cloneItems([primary])[0];
  const enItem = snapshot.en
    ? cloneItems([snapshot.en])[0]
    : cloneItems([primary])[0];

  persistLocale(collection, "zh", [zhItem, ...zhExisting]);
  persistLocale(collection, "en", [enItem, ...enExisting]);
  emit(collection);
  return true;
}

export function updatePostItem(
  collection: PostCollection,
  locale: Locale,
  current: EditablePost[],
  slug: string,
  patch: Partial<Omit<EditablePost, "slug">>,
  peerFallback: EditablePost[] = current,
): EditablePost[] {
  const items = current.map((item) =>
    item.slug === slug
      ? {
          ...item,
          ...patch,
          tags: patch.tags ? [...patch.tags] : item.tags,
          fields: patch.fields
            ? cloneExtraFields(patch.fields)
            : cloneExtraFields(item.fields),
          coreSlots: patch.coreSlots
            ? cloneCoreSlots(patch.coreSlots)
            : cloneCoreSlots(item.coreSlots ?? [...POST_CORE_SLOTS]),
        }
      : item,
  );
  saveWithPeerStructure(collection, locale, items, peerFallback);

  if (
    patch.title !== undefined ||
    patch.excerpt !== undefined ||
    patch.content !== undefined ||
    patch.tags !== undefined ||
    patch.fields !== undefined
  ) {
    void syncPeerText(collection, locale, slug, items);
  }

  return items;
}

async function syncPeerText(
  collection: PostCollection,
  locale: Locale,
  slug: string,
  sourceItems: EditablePost[],
) {
  const source = sourceItems.find((item) => item.slug === slug);
  if (!source) return;

  const peer = otherLocale(locale);
  const peerItems = readStoredOrFallback(collection, peer, sourceItems);

  const translatedTitle = source.title.trim()
    ? await translateTocNote(source.title, locale, peer)
    : "";
  const translatedExcerpt = source.excerpt.trim()
    ? await translateTocNote(source.excerpt, locale, peer)
    : "";
  const translatedContent = source.content.trim()
    ? await translateTocNote(source.content, locale, peer)
    : "";
  const translatedTags: string[] = [];
  for (const tag of source.tags) {
    const next = tag.trim()
      ? await translateTocNote(tag, locale, peer)
      : "";
    if (next) translatedTags.push(next);
  }
  const translatedFields = await translateExtraFields(
    source.fields,
    locale,
    peer,
  );

  if (source.title.trim() && translatedTitle) {
    rememberTocPhrase(source.title, translatedTitle, locale);
  }
  if (source.excerpt.trim() && translatedExcerpt) {
    rememberTocPhrase(source.excerpt, translatedExcerpt, locale);
  }

  const nextPeer = alignPeerStructure(sourceItems, peerItems).map((item) =>
    item.slug === slug
      ? {
          ...item,
          title: translatedTitle,
          excerpt: translatedExcerpt,
          content: translatedContent,
          tags: translatedTags,
          fields: translatedFields,
          coreSlots: cloneCoreSlots(source.coreSlots ?? [...POST_CORE_SLOTS]),
          date: source.date,
        }
      : item,
  );

  persistLocale(collection, peer, nextPeer);
  emit(collection, peer);
}
