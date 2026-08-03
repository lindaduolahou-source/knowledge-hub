import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSiteOwnerEmail } from "@/lib/supabase/env";

/** localStorage keys that sync to Supabase. */
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

/**
 * Keys shown to everyone (visitors). Personal tool stores are omitted so
 * visitors don't inherit the owner's trash / card vault.
 */
export const PUBLIC_DEFAULT_KEYS = [
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
  "knowledge-hub:contact-links",
] as const satisfies readonly CloudSyncKey[];

export function isSiteOwner(user: User | null | undefined): boolean {
  const owner = getSiteOwnerEmail();
  if (!owner || !user?.email) return false;
  return user.email.trim().toLowerCase() === owner;
}

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

/** Rough richness score so public pull does not wipe larger local recoveries. */
function payloadScore(payload: unknown): number {
  if (payload == null) return 0;
  try {
    return JSON.stringify(payload).length;
  } catch {
    return 0;
  }
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

/** Owner → official defaults table. */
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

/** Regular user → private table. */
export async function pushUserStore(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<{ error: string | null }> {
  const payload = readLocal(name);
  const { error } = await supabase.from("user_stores").upsert(
    {
      user_id: userId,
      name,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,name" },
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
 * Anyone (including logged-out visitors) pulls official defaults from
 * `site_stores` into localStorage.
 */
export async function pullPublicDefaults(
  supabase: SupabaseClient,
): Promise<{ error: string | null; pulled: number }> {
  const { data, error } = await supabase
    .from("site_stores")
    .select("name, payload");

  if (error) {
    return { error: error.message, pulled: 0 };
  }

  const cloud = new Map(
    (data ?? []).map((row) => [row.name as string, row.payload] as const),
  );

  let pulled = 0;
  for (const name of PUBLIC_DEFAULT_KEYS) {
    const cloudPayload = cloud.get(name);
    if (cloudPayload === undefined || isEmptyPayload(cloudPayload)) continue;
    const localPayload = readLocal(name);
    // Keep richer local data (e.g. recovered custom modules) instead of
    // overwriting with thinner cloud defaults on every page load.
    if (
      !isEmptyPayload(localPayload) &&
      payloadScore(localPayload) >= payloadScore(cloudPayload)
    ) {
      continue;
    }
    writeLocal(name, cloudPayload);
    pulled += 1;
  }

  if (pulled > 0) emitStoreRefresh();
  return { error: null, pulled };
}

/**
 * Regular user login: load public defaults, then overlay / seed private stores.
 */
export async function syncUserOnLogin(
  supabase: SupabaseClient,
  user: User,
): Promise<{ error: string | null; pulled: number; seeded: number }> {
  const pub = await pullPublicDefaults(supabase);
  if (pub.error) {
    return { error: pub.error, pulled: 0, seeded: 0 };
  }

  const { data, error } = await supabase
    .from("user_stores")
    .select("name, payload")
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message, pulled: 0, seeded: 0 };
  }

  const cloud = new Map(
    (data ?? []).map((row) => [row.name as string, row.payload] as const),
  );

  // First login: copy current defaults into this user's private DB.
  if (cloud.size === 0) {
    let seeded = 0;
    for (const name of CLOUD_SYNC_KEYS) {
      const local = readLocal(name);
      if (isEmptyPayload(local)) continue;
      const result = await pushUserStore(supabase, user.id, name);
      if (result.error) {
        return { error: result.error, pulled: 0, seeded };
      }
      seeded += 1;
    }
    emitStoreRefresh();
    return { error: null, pulled: 0, seeded };
  }

  let pulled = 0;
  for (const name of CLOUD_SYNC_KEYS) {
    if (!cloud.has(name)) continue;
    const cloudPayload = cloud.get(name);
    // Never replace local data with an empty/placeholder cloud row.
    if (cloudPayload === undefined || isEmptyPayload(cloudPayload)) continue;
    const localPayload = readLocal(name);
    if (
      !isEmptyPayload(localPayload) &&
      payloadScore(localPayload) > payloadScore(cloudPayload)
    ) {
      continue;
    }
    writeLocal(name, cloudPayload);
    pulled += 1;
  }
  emitStoreRefresh();
  return { error: null, pulled, seeded: 0 };
}

/**
 * Owner login: local non-empty stores are the source of truth and are pushed
 * to `site_stores` (so new mind maps / edits are not wiped by older cloud rows).
 * Empty local keys still pull from cloud. Regular users use private `user_stores`.
 */
export async function syncOnLogin(
  supabase: SupabaseClient,
  user?: User | null,
): Promise<{ error: string | null; pulled: number; pushed: number }> {
  if (user && !isSiteOwner(user)) {
    const result = await syncUserOnLogin(supabase, user);
    return {
      error: result.error,
      pulled: result.pulled + result.seeded,
      pushed: result.seeded,
    };
  }

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

    // Owner machine: keep and publish local content first.
    if (!localEmpty) {
      const result = await pushStore(supabase, name);
      if (result.error) {
        return { error: result.error, pulled, pushed };
      }
      pushed += 1;
    } else if (!cloudEmpty) {
      writeLocal(name, cloudPayload);
      pulled += 1;
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
