import {
  normalizeShareCardTypography,
  type ShareCardSticker,
  type ShareCardTypography,
} from "./share-card";

const STORAGE_PREFIX = "knowledge-hub:share-card-draft";

export type ShareCardDraft = {
  cardTitle: string;
  cardBody: string;
  backgroundUrl: string | null;
  stickers: ShareCardSticker[];
  selected: Record<string, boolean>;
  includeSelection: boolean;
  selectionText: string;
  typography: ShareCardTypography;
};

function storageKey(moduleId: string) {
  return `${STORAGE_PREFIX}:${moduleId}`;
}

export function loadShareCardDraft(moduleId: string): ShareCardDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(moduleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShareCardDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      cardTitle: typeof parsed.cardTitle === "string" ? parsed.cardTitle : "",
      cardBody: typeof parsed.cardBody === "string" ? parsed.cardBody : "",
      backgroundUrl:
        typeof parsed.backgroundUrl === "string" ? parsed.backgroundUrl : null,
      stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [],
      selected:
        parsed.selected && typeof parsed.selected === "object"
          ? parsed.selected
          : {},
      includeSelection: Boolean(parsed.includeSelection),
      selectionText:
        typeof parsed.selectionText === "string" ? parsed.selectionText : "",
      typography: normalizeShareCardTypography(parsed.typography),
    };
  } catch {
    return null;
  }
}

export function saveShareCardDraft(moduleId: string, draft: ShareCardDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    storageKey(moduleId),
    JSON.stringify({
      ...draft,
      typography: normalizeShareCardTypography(draft.typography),
    }),
  );
}

export function serializeShareCardDraft(draft: ShareCardDraft) {
  return JSON.stringify({
    ...draft,
    typography: normalizeShareCardTypography(draft.typography),
  });
}
