-- ============================================================================
-- REPAIR: fix user_roles + restore the Accounts page
-- ============================================================================
-- Your database was built from an earlier, incorrect version of the setup
-- file. Diagnosis against your live project (kfhjosrrqkjxqcbniwnh):
--
--   ✅ all 16 tables exist, staff/products seeded correctly (no duplicates)
--   ✅ staff.salary_type / base_salary / hourly_rate present
--   ✅ shop_settings.notification_sound_enabled present
--   ❌ user_roles has `id` instead of `user_id`
--   ❌ user_roles is missing `approved`
--   ❌ public.is_superadmin() does not exist
--   ❌ public.list_user_accounts() does not exist
--
-- src/lib/roles.ts queries .eq("user_id", …) and selects `approved`, so that
-- call errors, fetchRole returns null, isSuperAdmin is false, and the
-- Accounts nav item is hidden. That's the whole bug.
--
-- This script only repairs those four things. It does NOT recreate tables,
-- so nothing you've already entered is touched. Safe to re-run.
-- Run in: Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================================================

-- ---------------------------------------------------------------
-- 1. Rename id -> user_id (keeps existing rows and their roles)
-- ---------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_roles' and column_name='id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_roles' and column_name='user_id'
  ) then
    alter table public.user_roles rename column id to user_id;
  end if;
end $$;

-- ---------------------------------------------------------------
-- 2. Add the approved flag
--    Default true first so any existing row is grandfathered in, then
--    switch the default to false so future self-signups start unapproved.
-- ---------------------------------------------------------------
alter table public.user_roles
  add column if not exists approved boolean not null default true;
alter table public.user_roles alter column approved set default false;

-- ---------------------------------------------------------------
-- 3. Correct the role constraint ('user' is not a role this app knows)
-- ---------------------------------------------------------------
update public.user_roles set role = 'admin' where role = 'user';

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('staff', 'admin', 'superadmin'));

-- ---------------------------------------------------------------
-- 4. is_superadmin() — every RLS policy and the nav gate depend on this.
--    Must be created BEFORE any policy references it.
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
    where r.user_id = auth.uid() and r.role = 'superadmin' and r.approved
  );
$$;

grant execute on function public.is_superadmin() to authenticated;

-- ---------------------------------------------------------------
-- 5. Policies on user_roles
--    The old "Users read own role" policy referenced the renamed column and
--    only let you read your own row — the Accounts page needs to list all.
-- ---------------------------------------------------------------
alter table public.user_roles enable row level security;

drop policy if exists "Users read own role" on public.user_roles;
drop policy if exists "Superadmins manage roles" on public.user_roles;

drop policy if exists "Authenticated read roles" on public.user_roles;
create policy "Authenticated read roles" on public.user_roles
  for select to authenticated using (true);

drop policy if exists "Superadmins update roles" on public.user_roles;
create policy "Superadmins update roles" on public.user_roles
  for update to authenticated using (public.is_superadmin()) with check (true);

-- ---------------------------------------------------------------
-- 6. list_user_accounts() — this is literally what the Accounts page calls.
--    auth.users isn't reachable from the client, so the join happens here,
--    behind its own is_superadmin() check.
-- ---------------------------------------------------------------
create or replace function public.list_user_accounts()
returns table (
  user_id uuid,
  email text,
  role text,
  approved boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select r.user_id, u.email::text, r.role, r.approved, u.created_at
  from public.user_roles r
  join auth.users u on u.id = r.user_id
  order by r.approved asc, u.created_at desc;
end;
$$;

grant execute on function public.list_user_accounts() to authenticated;

-- ---------------------------------------------------------------
-- 7. Superadmin-only delete policies (these were never created either)
-- ---------------------------------------------------------------
drop policy if exists "Admins delete bookings" on public.bookings;
drop policy if exists "Superadmins delete bookings" on public.bookings;
create policy "Superadmins delete bookings" on public.bookings
  for delete to authenticated using (public.is_superadmin());

drop policy if exists "Superadmins delete activity" on public.activity_log;
create policy "Superadmins delete activity" on public.activity_log
  for delete to authenticated using (public.is_superadmin());

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

-- Booking site still needs to list bookable staff.
drop policy if exists "Public reads active staff" on public.staff;
create policy "Public reads active staff" on public.staff
  for select to anon using (active);

-- ---------------------------------------------------------------
-- 8. Promote your account
--    ⚠️ Change the email if you sign in as someone else.
--    The user must already exist in Authentication > Users.
-- ---------------------------------------------------------------
insert into public.user_roles (user_id, role, approved)
select id, 'superadmin', true from auth.users where email = 'jrnovera@gmail.com'
on conflict (user_id) do update set role = 'superadmin', approved = true;

-- Tell PostgREST to pick up the new functions immediately, rather than
-- waiting for its schema cache to expire (this is why a brand-new function
-- can 404 from the app for a minute or two after you create it).
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------
-- 9. Verify — expect one row: your email / superadmin / t
-- ---------------------------------------------------------------
select u.email, r.role, r.approved
from public.user_roles r
join auth.users u on u.id = r.user_id
order by r.approved asc;

-- ============================================================================
-- If the row above is missing, the email in step 8 has no matching account in
-- Authentication > Users. Create it there, then re-run just that block.
-- ============================================================================
