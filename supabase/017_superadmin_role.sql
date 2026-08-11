-- Superadmin as a real, database-enforced role.
-- Run in Supabase Dashboard > SQL Editor.
--
-- Until now "superadmin" existed only in the admin app's UI (lib/superadmin.ts
-- hides the destructive buttons). That is not a security boundary: every
-- policy below used to read `to authenticated using (true)`, so ANY signed-in
-- admin could delete a booking or a staff member by calling the REST API
-- directly, regardless of what the UI showed them. This migration moves the
-- rule into the database, where it actually holds.

-- ---------------------------------------------------------------
-- Role table
--
-- Keyed on auth.users so a deleted account can't leave a dangling grant.
-- Deliberately NOT writable from the client: no insert/update/delete policy
-- is created, so roles can only be granted from the SQL editor or a service
-- -role context. An admin cannot promote themselves through the app.
-- ---------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Everyone signed in may read the role table — the app needs to know its own
-- role to decide what to render, and there is nothing sensitive in it.
drop policy if exists "Authenticated read roles" on public.user_roles;
create policy "Authenticated read roles" on public.user_roles
  for select to authenticated using (true);

-- ---------------------------------------------------------------
-- Helper: is the caller a superadmin?
--
-- security definer so it can read user_roles even from inside a policy on
-- another table, and pinned search_path so the lookup can't be hijacked.
-- ---------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = 'superadmin'
  );
$$;

grant execute on function public.is_superadmin() to authenticated;

-- ---------------------------------------------------------------
-- Tighten the destructive policies
--
-- Reads, inserts and updates stay open to any admin — only deletion is
-- narrowed, which matches what the UI already gates.
-- ---------------------------------------------------------------
drop policy if exists "Admins delete bookings" on public.bookings;
create policy "Superadmins delete bookings" on public.bookings
  for delete to authenticated using (public.is_superadmin());

-- staff was covered by a single FOR ALL policy; split it so delete can be
-- held to a higher bar than select/insert/update.
drop policy if exists "Admins manage staff" on public.staff;

drop policy if exists "Admins read staff" on public.staff;
create policy "Admins read staff" on public.staff
  for select to authenticated using (true);

drop policy if exists "Admins insert staff" on public.staff;
create policy "Admins insert staff" on public.staff
  for insert to authenticated with check (true);

drop policy if exists "Admins update staff" on public.staff;
create policy "Admins update staff" on public.staff
  for update to authenticated using (true) with check (true);

drop policy if exists "Superadmins delete staff" on public.staff;
create policy "Superadmins delete staff" on public.staff
  for delete to authenticated using (public.is_superadmin());

-- ---------------------------------------------------------------
-- Granting the role
--
-- Create the account first in Dashboard > Authentication > Users (with
-- "Auto Confirm User" ticked), then run this to promote it. Re-runnable.
-- ---------------------------------------------------------------
insert into public.user_roles (user_id, role)
select id, 'superadmin' from auth.users where email = 'admin@gmail.com'
on conflict (user_id) do update set role = 'superadmin';

-- Check it worked — should return one row with role = superadmin.
select u.email, r.role
from public.user_roles r
join auth.users u on u.id = r.user_id;
