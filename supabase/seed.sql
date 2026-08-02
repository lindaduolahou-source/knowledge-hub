-- Knowledge Hub × Supabase — optional site seed
-- Run AFTER supabase/schema.sql (table + policies must exist).
--
-- Store list (17 total, see supabase/README.md). This seed only fills the
-- three stores that need real structure up front:
--   knowledge-hub:module-layout     modules order + customs
--   knowledge-hub:module-sections   space focus/skills
--   knowledge-hub:contact-links     email + github
-- The rest stay empty so the app falls back to built-in dictionaries.

begin;

-- Ordered explore modules (matches src/lib/modules.ts catalog order)
insert into public.site_stores (name, payload)
values (
  'knowledge-hub:module-layout',
  jsonb_build_object(
    'activeIds',
    jsonb_build_array('space', 'roadmap', 'knowledge', 'lab', 'thoughts', 'contact'),
    'custom', '{}'::jsonb
  )
)
on conflict (name) do update
set payload = excluded.payload, updated_at = now();

-- My Space — focus list + skills chips (mirrors src/app/[locale]/space/page.tsx)
insert into public.site_stores (name, payload)
values (
  'knowledge-hub:module-sections',
  jsonb_build_object(
    'space',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'focus', 'variant', 'list',
        'fields', '[]'::jsonb, 'coreSlots', jsonb_build_array('title', 'body')
      ),
      jsonb_build_object(
        'id', 'skills', 'variant', 'chips',
        'fields', '[]'::jsonb, 'coreSlots', jsonb_build_array('title', 'body')
      )
    )
  )
)
on conflict (name) do update
set payload = excluded.payload, updated_at = now();

-- Contact links — built-in email + github (mirrors DEFAULT_CONTACT_LINKS)
insert into public.site_stores (name, payload)
values (
  'knowledge-hub:contact-links',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'email', 'kind', 'email',
      'fields', '[]'::jsonb, 'coreSlots', jsonb_build_array('label', 'value')
    ),
    jsonb_build_object(
      'id', 'github', 'kind', 'github',
      'fields', '[]'::jsonb, 'coreSlots', jsonb_build_array('label', 'value')
    )
  )
)
on conflict (name) do update
set payload = excluded.payload, updated_at = now();

commit;
