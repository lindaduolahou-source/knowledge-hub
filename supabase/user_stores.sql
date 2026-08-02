-- Phase 2 (NOT required yet) — per-user private stores
-- Run only when you start Phase 2 in docs/APP_ROADMAP.md
--
-- After this exists, app sync will:
--   site_stores  = official defaults (everyone reads; owner writes)
--   user_stores  = each logged-in user's private copy

create table if not exists public.user_stores (
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);

create index if not exists user_stores_user_id_idx
  on public.user_stores (user_id);

create index if not exists user_stores_updated_at_idx
  on public.user_stores (updated_at desc);

alter table public.user_stores enable row level security;

drop policy if exists "Users read own stores" on public.user_stores;
create policy "Users read own stores"
  on public.user_stores
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users write own stores" on public.user_stores;
create policy "Users write own stores"
  on public.user_stores
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
