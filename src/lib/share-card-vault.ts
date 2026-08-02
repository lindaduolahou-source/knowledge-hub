import type { ShareCardDraft } from "./share-card-draft";
import {
  normalizeShareCardTypography,
  type ShareCardSticker,
} from "./share-card";
import { pushVaultCardToTrash } from "./trash";

const STORAGE_KEY = "knowledge-hub:share-card-vault";
export const SHARE_CARD_VAULT_EVENT = "knowledge-hub:share-card-vault-updated";

export type VaultCard = {
  id: string;
  name: string;
  moduleId: string;
  moduleIcon: string;
  createdAt: string;
  updatedAt: string;
  draft: ShareCardDraft;
};

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SHARE_CARD_VAULT_EVENT));
}

function normalizeDraft(value: unknown): ShareCardDraft {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<
    ShareCardDraft
  >;
  return {
    cardTitle: typeof parsed.cardTitle === "string" ? parsed.cardTitle : "",
    cardBody: typeof parsed.cardBody === "string" ? parsed.cardBody : "",
    backgroundUrl:
      typeof parsed.backgroundUrl === "string" ? parsed.backgroundUrl : null,
    stickers: Array.isArray(parsed.stickers)
      ? (parsed.stickers as ShareCardSticker[])
      : [],
    selected:
      parsed.selected && typeof parsed.selected === "object"
        ? parsed.selected
        : {},
    includeSelection: Boolean(parsed.includeSelection),
    selectionText:
      typeof parsed.selectionText === "string" ? parsed.selectionText : "",
    typography: normalizeShareCardTypography(parsed.typography),
  };
}

function normalizeCard(value: unknown): VaultCard | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<VaultCard>;
  if (typeof row.id !== "string" || !row.id) return null;
  if (typeof row.moduleId !== "string" || !row.moduleId) return null;
  const now = new Date().toISOString();
  return {
    id: row.id,
    name: typeof row.name === "string" && row.name.trim() ? row.name : "Card",
    moduleId: row.moduleId,
    moduleIcon:
      typeof row.moduleIcon === "string" && row.moduleIcon
        ? row.moduleIcon
        : "◇",
    createdAt:
      typeof row.createdAt === "string" && row.createdAt ? row.createdAt : now,
    updatedAt:
      typeof row.updatedAt === "string" && row.updatedAt ? row.updatedAt : now,
    draft: normalizeDraft(row.draft),
  };
}

export function emptyShareCardDraft(): ShareCardDraft {
  return {
    cardTitle: "",
    cardBody: "",
    backgroundUrl: null,
    stickers: [],
    selected: {},
    includeSelection: false,
    selectionText: "",
    typography: normalizeShareCardTypography(null),
  };
}

export function loadVaultCards(): VaultCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeCard)
      .filter((item): item is VaultCard => Boolean(item))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeVaultCards(cards: VaultCard[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  emit();
}

export function getVaultCard(id: string): VaultCard | null {
  return loadVaultCards().find((card) => card.id === id) ?? null;
}

export function createVaultCard(input: {
  moduleId: string;
  moduleIcon?: string;
  name: string;
  draft?: ShareCardDraft;
}): VaultCard {
  const now = new Date().toISOString();
  const card: VaultCard = {
    id: `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim() || "Card",
    moduleId: input.moduleId,
    moduleIcon: input.moduleIcon || "◇",
    createdAt: now,
    updatedAt: now,
    draft: normalizeDraft(input.draft ?? emptyShareCardDraft()),
  };
  writeVaultCards([card, ...loadVaultCards()]);
  return card;
}

export function updateVaultCard(
  id: string,
  patch: {
    name?: string;
    moduleIcon?: string;
    draft?: ShareCardDraft;
  },
): VaultCard | null {
  const cards = loadVaultCards();
  const index = cards.findIndex((card) => card.id === id);
  if (index < 0) return null;
  const prev = cards[index]!;
  const next: VaultCard = {
    ...prev,
    name:
      typeof patch.name === "string" && patch.name.trim()
        ? patch.name.trim()
        : prev.name,
    moduleIcon: patch.moduleIcon || prev.moduleIcon,
    draft: patch.draft ? normalizeDraft(patch.draft) : prev.draft,
    updatedAt: new Date().toISOString(),
  };
  const list = [...cards];
  list[index] = next;
  writeVaultCards(list);
  return next;
}

export function removeVaultCard(id: string): boolean {
  const cards = loadVaultCards();
  const removed = cards.find((card) => card.id === id);
  if (!removed) return false;
  pushVaultCardToTrash({
    title: removed.name || removed.draft.cardTitle || removed.id,
    card: removed,
  });
  writeVaultCards(cards.filter((card) => card.id !== id));
  return true;
}

/** Restore a vault card from trash (keeps original id when free). */
export function restoreVaultCard(card: VaultCard): boolean {
  const cards = loadVaultCards();
  if (cards.some((item) => item.id === card.id)) {
    const clone: VaultCard = {
      ...card,
      id: `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      updatedAt: new Date().toISOString(),
    };
    writeVaultCards([clone, ...cards]);
    return true;
  }
  writeVaultCards([
    { ...card, updatedAt: new Date().toISOString() },
    ...cards,
  ]);
  return true;
}

export function saveDraftToVault(input: {
  moduleId: string;
  moduleIcon?: string;
  draft: ShareCardDraft;
  /** Update this card when set; otherwise create a new one. */
  cardId?: string | null;
}): VaultCard {
  const name =
    input.draft.cardTitle.trim() ||
    input.draft.cardBody.trim().slice(0, 24) ||
    "Card";
  if (input.cardId) {
    const updated = updateVaultCard(input.cardId, {
      name,
      moduleIcon: input.moduleIcon,
      draft: input.draft,
    });
    if (updated) return updated;
  }
  return createVaultCard({
    moduleId: input.moduleId,
    moduleIcon: input.moduleIcon,
    name,
    draft: input.draft,
  });
}
