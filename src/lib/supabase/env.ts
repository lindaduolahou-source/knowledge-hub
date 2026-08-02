export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
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
