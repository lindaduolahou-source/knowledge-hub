-- Knowledge Hub × Supabase
-- Run this once in: Supabase Dashboard → SQL Editor → New query → Run
--
-- After running:
-- 1. Authentication → Providers → Email → enable
-- 2. Authentication → Providers → Email → disable "Enable sign-ups"
--    (or keep sign-ups on just long enough to create YOUR account, then disable)
-- 3. Authentication → URL Configuration → Site URL = http://127.0.0.1:3000
--    Redirect URLs add: http://127.0.0.1:3000/auth/callback
--    and your production URL + /auth/callback

create table if not exists public.site_stores (
  name text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists site_stores_updated_at_idx
  on public.site_stores (updated_at desc);

alter table public.site_stores enable row level security;

-- Public can read (site content for visitors)
drop policy if exists "Public read site_stores" on public.site_stores;
create policy "Public read site_stores"
  on public.site_stores
  for select
  using (true);

-- Only signed-in users can insert/update/delete (your owner account)
drop policy if exists "Authenticated write site_stores" on public.site_stores;
create policy "Authenticated write site_stores"
  on public.site_stores
  for all
  to authenticated
  using (true)
  with check (true);
