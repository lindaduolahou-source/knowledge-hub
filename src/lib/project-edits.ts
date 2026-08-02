import type { Locale } from "@/i18n/config";
import type { Project } from "@/lib/content";
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
import { pushProjectToTrash } from "@/lib/trash";
import { moveIndex } from "@/lib/reorder";

const STORAGE_KEY = "knowledge-hub:project-items";
export const PROJECT_ITEMS_EVENT = "knowledge-hub:project-items-updated";
export const PROJECT_FOCUS_EDIT_EVENT = "knowledge-hub:project-focus-edit";

export const PROJECT_CORE_SLOTS = ["title", "description", "link"] as const;
export type ProjectCoreSlot = (typeof PROJECT_CORE_SLOTS)[number];

export function requestProjectEdit(moduleId: string, slug: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PROJECT_FOCUS_EDIT_EVENT, {
      detail: { moduleId, slug },
    }),
  );
}

/** @deprecated use ExtraField */
export type ProjectExtraField = ExtraField;

export type EditableProject = {
  slug: string;
  title: string;
  description: string;
  date: string;
  /** Optional share link. */
  link?: string;
  /** Full project body (detail page, Markdown). */
  content: string;
  /** Extra user-defined fields within the project. */
  fields: ExtraField[];
  /** Built-in title/description/link slots still shown. */
  coreSlots: ProjectCoreSlot[];
  /** @deprecated kept for migration */
  tags?: string[];
  github?: string;
  demo?: string;
  featured?: boolean;
};

/** Path under /[locale]/ for project detail links (no leading slash). */
export function projectHrefPrefixForModule(moduleId: string): string {
  if (moduleId === "lab") return "projects";
  return `p/${moduleId}`;
}

export function projectDetailHref(
  locale: string,
  moduleId: string,
  slug: string,
) {
  return `/${locale}/${projectHrefPrefixForModule(moduleId)}/${slug}`;
}

/** Per-module project lists. Legacy flat `{ zh, en }` is migrated into `lab`. */
type ProjectStore = Record<string, Partial<Record<Locale, EditableProject[]>>>;

function otherLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

function emit(moduleId: string, locale?: Locale) {
  window.dispatchEvent(
    new CustomEvent(PROJECT_ITEMS_EVENT, {
      detail: { moduleId, locale },
    }),
  );
}

function isLocaleBucket(
  value: unknown,
): value is Partial<Record<Locale, EditableProject[]>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.every((key) => key === "zh" || key === "en");
}

function loadStore(): ProjectStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as
      | ProjectStore
      | Partial<Record<Locale, EditableProject[]>>;
    if (!parsed || typeof parsed !== "object") return {};

    if ("zh" in parsed || "en" in parsed) {
      const legacy = parsed as Partial<Record<Locale, EditableProject[]>>;
      if (Array.isArray(legacy.zh) || Array.isArray(legacy.en)) {
        return { lab: { zh: legacy.zh, en: legacy.en } };
      }
    }

    const next: ProjectStore = {};
    for (const [moduleId, bucket] of Object.entries(parsed)) {
      if (isLocaleBucket(bucket)) next[moduleId] = bucket;
    }
    return next;
  } catch {
    return {};
  }
}

function writeStore(store: ProjectStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function normalizeItem(item: unknown): EditableProject | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Partial<EditableProject> & {
    github?: string;
    demo?: string;
  };
  if (typeof row.slug !== "string" || !row.slug) return null;
  const link =
    (typeof row.link === "string" && row.link) ||
    (typeof row.github === "string" && row.github) ||
    (typeof row.demo === "string" && row.demo) ||
    undefined;
  return {
    slug: row.slug,
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : "",
    date:
      typeof row.date === "string" && row.date
        ? row.date
        : new Date().toISOString().slice(0, 10),
    link: link || undefined,
    content: typeof row.content === "string" ? row.content : "",
    fields: normalizeExtraFields(row.fields),
    coreSlots: normalizeCoreSlots(row.coreSlots, PROJECT_CORE_SLOTS),
    featured: Boolean(row.featured),
  };
}

function cloneItems(items: EditableProject[]): EditableProject[] {
  return items.map((item) => ({
    slug: item.slug,
    title: item.title,
    description: item.description,
    date: item.date,
    link: item.link,
    content: item.content,
    fields: cloneExtraFields(item.fields),
    coreSlots: cloneCoreSlots(item.coreSlots ?? [...PROJECT_CORE_SLOTS]),
    featured: item.featured,
  }));
}

export function projectFromContent(project: Project): EditableProject {
  return {
    slug: project.slug,
    title: project.title,
    description: project.description,
    date: project.date,
    link: project.github || project.demo,
    content: "",
    fields: [],
    coreSlots: [...PROJECT_CORE_SLOTS],
    featured: project.featured,
  };
}

function persistLocale(
  moduleId: string,
  locale: Locale,
  items: EditableProject[],
) {
  const store = loadStore();
  store[moduleId] = {
    ...(store[moduleId] ?? {}),
    [locale]: cloneItems(items),
  };
  writeStore(store);
}

export function loadProjectItems(
  moduleId: string,
  locale: Locale,
  defaults: EditableProject[],
): EditableProject[] {
  const stored = loadStore()[moduleId]?.[locale];
  if (Array.isArray(stored)) {
    return stored
      .map(normalizeItem)
      .filter((item): item is EditableProject => Boolean(item));
  }
  return cloneItems(defaults);
}

export function findEditableProject(
  moduleId: string,
  locale: Locale,
  slug: string,
  fallback: EditableProject | null,
): EditableProject | null {
  const items = loadProjectItems(
    moduleId,
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
  moduleId: string,
  locale: Locale,
  fallback: EditableProject[],
): EditableProject[] {
  const stored = loadStore()[moduleId]?.[locale];
  if (Array.isArray(stored)) {
    return stored
      .map(normalizeItem)
      .filter((item): item is EditableProject => Boolean(item));
  }
  return cloneItems(fallback);
}

function alignPeerStructure(
  sourceItems: EditableProject[],
  peerExisting: EditableProject[],
): EditableProject[] {
  const peerBySlug = new Map(peerExisting.map((item) => [item.slug, item]));
  return sourceItems.map((item) => {
    const prev = peerBySlug.get(item.slug);
    if (!prev) {
      return {
        ...item,
        fields: cloneExtraFields(item.fields),
        coreSlots: cloneCoreSlots(item.coreSlots ?? [...PROJECT_CORE_SLOTS]),
      };
    }
    return {
      ...prev,
      date: item.date,
      featured: item.featured,
      link: item.link,
      fields: alignExtraFields(item.fields, prev.fields),
      coreSlots: cloneCoreSlots(item.coreSlots ?? [...PROJECT_CORE_SLOTS]),
    };
  });
}

function saveWithPeerStructure(
  moduleId: string,
  locale: Locale,
  items: EditableProject[],
  peerFallback: EditableProject[],
) {
  persistLocale(moduleId, locale, items);
  const peer = otherLocale(locale);
  const peerExisting = readStoredOrFallback(moduleId, peer, peerFallback);
  persistLocale(moduleId, peer, alignPeerStructure(items, peerExisting));
  emit(moduleId);
}

export function createProjectItem(
  moduleId: string,
  locale: Locale,
  current: EditableProject[],
  seed: { title: string; description: string; content?: string },
  peerFallback: EditableProject[] = current,
): { items: EditableProject[]; slug: string } {
  const slug = `project-${Date.now().toString(36)}`;
  const items: EditableProject[] = [
    ...current,
    {
      slug,
      title: seed.title,
      description: seed.description,
      date: new Date().toISOString().slice(0, 10),
      link: undefined,
      content: seed.content ?? "",
      fields: [],
      coreSlots: [...PROJECT_CORE_SLOTS],
      featured: false,
    },
  ];
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  void syncPeerText(moduleId, locale, slug, items);
  return { items, slug };
}

export function removeProjectItem(
  moduleId: string,
  locale: Locale,
  current: EditableProject[],
  slug: string,
  peerFallback: EditableProject[] = current,
): EditableProject[] {
  const removed = current.find((item) => item.slug === slug);
  if (removed) {
    const peer = otherLocale(locale);
    const peerItems = readStoredOrFallback(moduleId, peer, peerFallback);
    const peerRemoved = peerItems.find((item) => item.slug === slug);
    pushProjectToTrash({
      moduleId,
      title: removed.title.trim() || peerRemoved?.title.trim() || slug,
      snapshot: {
        [locale]: cloneItems([removed])[0],
        [peer]: cloneItems([peerRemoved ?? removed])[0],
      },
    });
  }
  const items = current.filter((item) => item.slug !== slug);
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  return items;
}

export function reorderProjectItems(
  moduleId: string,
  locale: Locale,
  current: EditableProject[],
  from: number,
  to: number,
  peerFallback: EditableProject[] = current,
): EditableProject[] {
  const items = moveIndex(current, from, to);
  if (items === current) return current;
  saveWithPeerStructure(moduleId, locale, items, peerFallback);
  return items;
}

export function restoreProjectItem(
  moduleId: string,
  snapshot: Partial<Record<Locale, EditableProject>>,
): boolean {
  const primary = snapshot.zh ?? snapshot.en;
  if (!primary) return false;

  const zhExisting = loadProjectItems(moduleId, "zh", []);
  const enExisting = loadProjectItems(moduleId, "en", []);
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

  persistLocale(moduleId, "zh", [zhItem, ...zhExisting]);
  persistLocale(moduleId, "en", [enItem, ...enExisting]);
  emit(moduleId);
  return true;
}

export function updateProjectItem(
  moduleId: string,
  locale: Locale,
  current: EditableProject[],
  slug: string,
  patch: Partial<Omit<EditableProject, "slug">>,
  peerFallback: EditableProject[] = current,
): EditableProject[] {
  const items = current.map((item) =>
    item.slug === slug
      ? {
          ...item,
          ...patch,
          fields: patch.fields
            ? cloneExtraFields(patch.fields)
            : cloneExtraFields(item.fields),
          coreSlots: patch.coreSlots
            ? cloneCoreSlots(patch.coreSlots)
            : cloneCoreSlots(item.coreSlots ?? [...PROJECT_CORE_SLOTS]),
        }
      : item,
  );
  saveWithPeerStructure(moduleId, locale, items, peerFallback);

  if (
    patch.title !== undefined ||
    patch.description !== undefined ||
    patch.link !== undefined ||
    patch.content !== undefined ||
    patch.fields !== undefined
  ) {
    void syncPeerText(moduleId, locale, slug, items);
  }

  return items;
}

async function syncPeerText(
  moduleId: string,
  locale: Locale,
  slug: string,
  sourceItems: EditableProject[],
) {
  const source = sourceItems.find((item) => item.slug === slug);
  if (!source) return;

  const peer = otherLocale(locale);
  const peerItems = readStoredOrFallback(moduleId, peer, sourceItems);

  const translatedTitle = source.title.trim()
    ? await translateTocNote(source.title, locale, peer)
    : "";
  const translatedDescription = source.description.trim()
    ? await translateTocNote(source.description, locale, peer)
    : "";
  const translatedContent = source.content.trim()
    ? await translateTocNote(source.content, locale, peer)
    : "";
  const translatedFields = await translateExtraFields(
    source.fields,
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
    item.slug === slug
      ? {
          ...item,
          title: translatedTitle,
          description: translatedDescription,
          content: translatedContent,
          link: source.link,
          fields: translatedFields,
          coreSlots: cloneCoreSlots(
            source.coreSlots ?? [...PROJECT_CORE_SLOTS],
          ),
          date: source.date,
          featured: source.featured,
        }
      : item,
  );

  persistLocale(moduleId, peer, nextPeer);
  emit(moduleId, peer);
}
