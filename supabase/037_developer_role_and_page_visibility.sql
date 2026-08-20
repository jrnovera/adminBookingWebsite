-- Adds a 'developer' role (same DB-enforced pattern as 017_superadmin_role.sql)
-- and a page_visibility table the developer account uses to hide/show nav
-- links for staff and for the admin/superadmin tier. Nothing below can ever
-- hide anything from the developer — that check lives in the app (see
-- navConfig.tsx's isVisible) and this table has no notion of "developer" to
-- hide from in the first place.
--
-- Run in Supabase Dashboard > SQL Editor.

-- ---------------------------------------------------------------
-- Developer role
--
-- Deliberately NOT exposed in the Accounts page's role dropdown (see
-- src/app/accounts/page.tsx) — a superadmin can promote another account to
-- superadmin through the UI, but 'developer' is a step above that: it's the
-- only role that can touch page_visibility below, and it's meant to stay
-- with the agency/developer maintaining the app, not the salon's own staff.
-- Grant it the same way the very first superadmin is granted: directly in
-- the SQL editor (see the bottom of this file).
-- ---------------------------------------------------------------
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('staff', 'admin', 'superadmin', 'developer'));

create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = 'developer'
  );
$$;

grant execute on function public.is_developer() to authenticated;

-- ---------------------------------------------------------------
-- Page visibility
--
-- One row per manageable nav item (keyed by its href, e.g. '/payroll').
-- hidden_from_staff / hidden_from_admin each independently hide the item's
-- sidebar link for that tier — 'admin' here covers both admin and
-- superadmin, since the app doesn't otherwise distinguish the two for
-- nav purposes. A missing row (or the table failing to load) means
-- visible, so the feature fails open rather than hiding pages if this
-- table is empty or briefly unreachable.
-- ---------------------------------------------------------------
create table if not exists public.page_visibility (
  key text primary key,
  hidden_from_staff boolean not null default false,
  hidden_from_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.page_visibility enable row level security;

-- Every signed-in account needs to read this to know what its own nav
-- should show — nothing in the table is sensitive.
drop policy if exists "Authenticated read page visibility" on public.page_visibility;
create policy "Authenticated read page visibility" on public.page_visibility
  for select to authenticated using (true);

drop policy if exists "Developers manage page visibility" on public.page_visibility;
create policy "Developers manage page visibility" on public.page_visibility
  for all to authenticated
  using (public.is_developer())
  with check (public.is_developer());

-- Seed a row for every item the sidebar currently offers, preserving what's
-- hidden from staff today (see navConfig.tsx) so installing this migration
-- doesn't change anyone's visible nav until the developer actually touches a
-- toggle.
insert into public.page_visibility (key, hidden_from_staff, hidden_from_admin)
values
  ('/', false, false),
  ('/calendar', false, false),
  ('/appointments', false, false),
  ('/clients', false, false),
  ('/pos', false, false),
  ('/transactions', false, false),
  ('/reports', true, false),
  ('/staff', true, false),
  ('/attendance', true, false),
  ('/payroll', true, false),
  ('/services', true, false),
  ('/inventory', false, false),
  ('/promos', false, false),
  ('/edit-page', true, false),
  ('/settings', true, false)
on conflict (key) do nothing;

-- ---------------------------------------------------------------
-- Grant yourself developer
--
-- Create the account first in Dashboard > Authentication > Users (with
-- "Auto Confirm User" ticked) if it doesn't exist yet, then uncomment and
-- run this with the real email. Re-runnable.
-- ---------------------------------------------------------------
-- insert into public.user_roles (user_id, role)
-- select id, 'developer' from auth.users where email = 'YOUR_EMAIL_HERE'
-- on conflict (user_id) do update set role = 'developer';
