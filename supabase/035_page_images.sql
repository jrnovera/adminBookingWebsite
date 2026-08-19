-- Admin-editable images for the public site's page hero/banner sections
-- (home hero, and the top banner on services, team, reviews, blog, promos,
-- about). Keyed rows rather than fixed columns so new page slots can be
-- added later without another migration. Safe to re-run.

create table if not exists public.page_images (
  key text primary key,
  url text not null,
  updated_at timestamptz not null default now()
);

alter table public.page_images enable row level security;

drop policy if exists "Admins manage page images" on public.page_images;
create policy "Admins manage page images" on public.page_images
  for all to authenticated using (true) with check (true);

drop policy if exists "Public reads page images" on public.page_images;
create policy "Public reads page images" on public.page_images
  for select to anon using (true);
