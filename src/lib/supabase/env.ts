/** Accept project URL or a pasted REST URL like .../rest/v1/. */
function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    // Dashboard sometimes copies https://xxx.supabase.co/rest/v1
    return `${url.protocol}//${url.host}`;
  } catch {
    return trimmed.replace(/\/rest\/v1.*$/i, "").replace(/\/+$/, "");
  }
}

export function getSupabaseEnv() {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  );
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return { url, anonKey };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey && !url.includes("YOUR_PROJECT"));
}

export function getSiteOwnerEmail() {
  return process.env.NEXT_PUBLIC_SITE_OWNER_EMAIL?.trim().toLowerCase() || null;
}
