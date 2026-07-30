import type { ModuleId } from "./modules";
import { createSyncedTextStore } from "./personal-store";
import { getPublishedText } from "./published-site";

export const TOC_NOTES_EVENT = "knowledge-hub:toc-notes-updated";

export type TocNotes = Partial<Record<ModuleId, string>>;

const store = createSyncedTextStore({
  prefix: "knowledge-hub:toc-notes",
  eventName: TOC_NOTES_EVENT,
  getPublished: (locale, key) => getPublishedText("tocNotes", locale, key),
});

export function loadTocNotes(locale: Parameters<typeof store.load>[0]): TocNotes {
  return store.load(locale) as TocNotes;
}

export function resolveTocNote(
  locale: Parameters<typeof store.resolve>[0],
  id: ModuleId,
  defaultText: string,
): string {
  return store.resolve(locale, id, defaultText);
}

export async function saveTocNote(
  locale: Parameters<typeof store.save>[0],
  id: ModuleId,
  value: string,
) {
  return store.save(locale, id, value);
}

export async function ensureCrossLocaleTocNotes() {
  return store.ensureCrossLocale();
}

export function purgeTocNotesForModule(moduleId: ModuleId) {
  store.removeKeysMatching((key) => key === moduleId);
}
