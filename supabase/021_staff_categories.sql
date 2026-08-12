-- Which service categories each staff member is qualified to perform
-- ("expertise/duty") — e.g. Hair, Nails, Massage. Scoped by category rather
-- than individual service: there are only a handful of categories vs.
-- dozens of services, so this is a short checklist to fill in on the Staff
-- form instead of ticking every treatment one by one.
--
-- Drives two things:
--   1. Admin: the Staff form scopes a team member to the categories they
--      actually work in.
--   2. Booking site: step 2 (choose staff) only lists staff whose scope
--      includes the category of the service picked in step 1.
--
-- A staff member with NO rows here is treated as bookable for anything —
-- see the app-side filtering — so existing team members (created before
-- this table existed) keep working exactly as before until an admin
-- explicitly scopes them.
-- Run in Supabase Dashboard > SQL Editor.

create table if not exists public.staff_categories (
  staff_id uuid not null references public.staff (id) on delete cascade,
  category_id uuid not null references public.service_categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (staff_id, category_id)
);

create index if not exists staff_categories_category_id_idx
  on public.staff_categories (category_id);

-- ---------------------------------------------------------------
-- Row level security — same shape as service_categories/services:
-- admins manage everything, the public booking site may only read (it
-- needs the full mapping, not just "active" rows, since eligibility is
-- computed client-side against already-active staff/categories).
-- ---------------------------------------------------------------
alter table public.staff_categories enable row level security;

drop policy if exists "Admins manage staff categories" on public.staff_categories;
create policy "Admins manage staff categories" on public.staff_categories
  for all to authenticated using (true) with check (true);

drop policy if exists "Public reads staff categories" on public.staff_categories;
create policy "Public reads staff categories" on public.staff_categories
  for select to anon using (true);
