/**
 * Deleted section ids that must never be re-added by reconcile or cloud pull.
 * Soft-delete and permanent trash purge both leave a tombstone; restore clears it.
 */
const STORAGE_KEY = "knowledge-hub:section-tombstones";
export const SECTION_TOMBSTONES_EVENT =
  "knowledge-hub:section-tombstones-updated";

export type SectionTombstones = Record<string, number>;

export function sectionTombstoneKey(moduleId: string, sectionId: string) {
  return `${moduleId}:${sectionId}`;
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SECTION_TOMBSTONES_EVENT));
}

export function loadSectionTombstones(): SectionTombstones {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: SectionTombstones = {};
    for (const [key, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof key === "string" && key.includes(":") && typeof value === "number") {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeSectionTombstones(map: SectionTombstones, silent = false) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  if (!silent) emit();
}

export function isSectionTombstoned(moduleId: string, sectionId: string) {
  return Object.prototype.hasOwnProperty.call(
    loadSectionTombstones(),
    sectionTombstoneKey(moduleId, sectionId),
  );
}

export function tombstonedSectionIds(moduleId: string): Set<string> {
  const prefix = `${moduleId}:`;
  const ids = new Set<string>();
  for (const key of Object.keys(loadSectionTombstones())) {
    if (!key.startsWith(prefix)) continue;
    ids.add(key.slice(prefix.length));
  }
  return ids;
}

export function addSectionTombstone(moduleId: string, sectionId: string) {
  if (typeof window === "undefined" || !moduleId || !sectionId) return;
  const map = loadSectionTombstones();
  const key = sectionTombstoneKey(moduleId, sectionId);
  if (map[key]) return;
  map[key] = Date.now();
  writeSectionTombstones(map);
}

export function removeSectionTombstone(moduleId: string, sectionId: string) {
  if (typeof window === "undefined" || !moduleId || !sectionId) return;
  const map = loadSectionTombstones();
  const key = sectionTombstoneKey(moduleId, sectionId);
  if (!Object.prototype.hasOwnProperty.call(map, key)) return;
  delete map[key];
  writeSectionTombstones(map);
}

/** Union by latest timestamp — deletions accumulate across devices. */
export function mergeSectionTombstones(
  incoming: unknown,
  options?: { silent?: boolean },
): SectionTombstones {
  const local = loadSectionTombstones();
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return local;
  }
  const next: SectionTombstones = { ...local };
  let changed = false;
  for (const [key, value] of Object.entries(
    incoming as Record<string, unknown>,
  )) {
    if (typeof key !== "string" || !key.includes(":")) continue;
    if (typeof value !== "number") continue;
    if (!next[key] || value > next[key]) {
      next[key] = value;
      changed = true;
    }
  }
  if (changed || Object.keys(local).length !== Object.keys(next).length) {
    // Also detect keys only in next from local (no-op) — write if any change.
    const localKeys = Object.keys(local);
    const nextKeys = Object.keys(next);
    const reallyChanged =
      changed ||
      localKeys.length !== nextKeys.length ||
      nextKeys.some((key) => local[key] !== next[key]);
    if (reallyChanged) {
      writeSectionTombstones(next, options?.silent);
    }
  }
  return next;
}

export function parseTombstonesPayload(payload: unknown): SectionTombstones {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  const out: SectionTombstones = {};
  for (const [key, value] of Object.entries(
    payload as Record<string, unknown>,
  )) {
    if (typeof key === "string" && key.includes(":") && typeof value === "number") {
      out[key] = value;
    }
  }
  return out;
}

/** Batch-add tombstones (single write) from soft-deleted trash rows. */
export function seedTombstonesFromEntries(
  entries: Array<{ moduleId: string; sectionId: string; deletedAt?: number }>,
) {
  if (typeof window === "undefined" || entries.length === 0) return false;
  const map = loadSectionTombstones();
  let changed = false;
  for (const entry of entries) {
    if (!entry.moduleId || !entry.sectionId) continue;
    const key = sectionTombstoneKey(entry.moduleId, entry.sectionId);
    if (map[key]) continue;
    map[key] = entry.deletedAt ?? Date.now();
    changed = true;
  }
  if (changed) writeSectionTombstones(map);
  return changed;
}
