import type { SupabaseClient } from "@supabase/supabase-js";

/** localStorage keys that sync to Supabase `site_stores`. */
export const CLOUD_SYNC_KEYS = [
  "knowledge-hub:module-content:zh",
  "knowledge-hub:module-content:en",
  "knowledge-hub:toc-notes:zh",
  "knowledge-hub:toc-notes:en",
  "knowledge-hub:module-layout",
  "knowledge-hub:module-sections",
  "knowledge-hub:module-page-blocks",
  "knowledge-hub:project-items",
  "knowledge-hub:post-items",
  "knowledge-hub:roadmap-items",
  "knowledge-hub:mindmap-items",
  "knowledge-hub:mindmap-library",
  "knowledge-hub:mindmap-style-library",
  "knowledge-hub:contact-links",
  "knowledge-hub:trash",
  "knowledge-hub:share-card-vault",
  "knowledge-hub:share-card-library",
] as const;

export type CloudSyncKey = (typeof CLOUD_SYNC_KEYS)[number];

/** Custom events that mean a synced store changed. */
export const CLOUD_SYNC_EVENTS = [
  "knowledge-hub:module-content-updated",
  "knowledge-hub:toc-notes-updated",
  "knowledge-hub:module-layout-updated",
  "knowledge-hub:module-sections-updated",
  "knowledge-hub:module-page-blocks-updated",
  "knowledge-hub:project-items-updated",
  "knowledge-hub:post-items-updated",
  "knowledge-hub:roadmap-items-updated",
  "knowledge-hub:mindmap-items-updated",
  "knowledge-hub:mindmap-library-updated",
  "knowledge-hub:mindmap-style-library-updated",
  "knowledge-hub:contact-links-updated",
  "knowledge-hub:trash-updated",
  "knowledge-hub:share-card-vault-updated",
  "knowledge-hub:share-card-library-updated",
] as const;

export const CLOUD_SYNC_READY_EVENT = "knowledge-hub:cloud-sync-ready";

function parsePayload(raw: string | null): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

function isEmptyPayload(payload: unknown): boolean {
  if (payload == null) return true;
  if (Array.isArray(payload)) return payload.length === 0;
  if (typeof payload === "object") {
    return Object.keys(payload as object).length === 0;
  }
  return false;
}

function readLocal(name: string): unknown {
  if (typeof window === "undefined") return {};
  return parsePayload(window.localStorage.getItem(name));
}

function writeLocal(name: string, payload: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(name, JSON.stringify(payload ?? {}));
}

function emitStoreRefresh() {
  if (typeof window === "undefined") return;
  for (const eventName of CLOUD_SYNC_EVENTS) {
    window.dispatchEvent(new CustomEvent(eventName));
  }
  window.dispatchEvent(new CustomEvent(CLOUD_SYNC_READY_EVENT));
}

export async function pushStore(
  supabase: SupabaseClient,
  name: string,
): Promise<{ error: string | null }> {
  const payload = readLocal(name);
  const { error } = await supabase.from("site_stores").upsert(
    {
      name,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" },
  );
  return { error: error?.message ?? null };
}

export async function pushAllStores(
  supabase: SupabaseClient,
): Promise<{ error: string | null }> {
  for (const name of CLOUD_SYNC_KEYS) {
    const local = readLocal(name);
    if (isEmptyPayload(local)) continue;
    const { error } = await pushStore(supabase, name);
    if (error) return { error };
  }
  return { error: null };
}

/**
 * On login: cloud wins when present; otherwise upload local.
 * Then UI refreshes from localStorage.
 */
export async function syncOnLogin(
  supabase: SupabaseClient,
): Promise<{ error: string | null; pulled: number; pushed: number }> {
  const { data, error } = await supabase
    .from("site_stores")
    .select("name, payload, updated_at");

  if (error) {
    return { error: error.message, pulled: 0, pushed: 0 };
  }

  const cloud = new Map(
    (data ?? []).map((row) => [row.name as string, row.payload] as const),
  );

  let pulled = 0;
  let pushed = 0;

  for (const name of CLOUD_SYNC_KEYS) {
    const cloudPayload = cloud.get(name);
    const localPayload = readLocal(name);
    const cloudEmpty =
      cloudPayload === undefined || isEmptyPayload(cloudPayload);
    const localEmpty = isEmptyPayload(localPayload);

    if (!cloudEmpty) {
      writeLocal(name, cloudPayload);
      pulled += 1;
    } else if (!localEmpty) {
      const result = await pushStore(supabase, name);
      if (result.error) {
        return { error: result.error, pulled, pushed };
      }
      pushed += 1;
    }
  }

  emitStoreRefresh();
  return { error: null, pulled, pushed };
}

export function keysForEvent(eventName: string): CloudSyncKey[] {
  if (eventName.includes("module-content")) {
    return [
      "knowledge-hub:module-content:zh",
      "knowledge-hub:module-content:en",
    ];
  }
  if (eventName.includes("toc-notes")) {
    return ["knowledge-hub:toc-notes:zh", "knowledge-hub:toc-notes:en"];
  }
  const map: Record<string, CloudSyncKey> = {
    "knowledge-hub:module-layout-updated": "knowledge-hub:module-layout",
    "knowledge-hub:module-sections-updated": "knowledge-hub:module-sections",
    "knowledge-hub:module-page-blocks-updated":
      "knowledge-hub:module-page-blocks",
    "knowledge-hub:project-items-updated": "knowledge-hub:project-items",
    "knowledge-hub:post-items-updated": "knowledge-hub:post-items",
    "knowledge-hub:roadmap-items-updated": "knowledge-hub:roadmap-items",
    "knowledge-hub:mindmap-items-updated": "knowledge-hub:mindmap-items",
    "knowledge-hub:mindmap-library-updated": "knowledge-hub:mindmap-library",
    "knowledge-hub:mindmap-style-library-updated":
      "knowledge-hub:mindmap-style-library",
    "knowledge-hub:contact-links-updated": "knowledge-hub:contact-links",
    "knowledge-hub:trash-updated": "knowledge-hub:trash",
    "knowledge-hub:share-card-vault-updated": "knowledge-hub:share-card-vault",
    "knowledge-hub:share-card-library-updated":
      "knowledge-hub:share-card-library",
  };
  const one = map[eventName];
  return one ? [one] : [];
}
