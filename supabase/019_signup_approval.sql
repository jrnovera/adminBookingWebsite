-- Self-service signup, gated behind superadmin approval.
-- Run in Supabase Dashboard > SQL Editor. Already applied live via the
-- management API on 2026-08-11 — this file keeps the schema history
-- reproducible; safe to re-run.
--
-- Anyone can sign up (see supabase/functions/self-signup), and always lands
-- as role='staff', approved=false — they exist but is_superadmin()/any
-- future is_approved() check treats them as having no access until a
-- superadmin flips `approved` to true from the new Team/Users screen.

-- Backfill existing rows (jrnovera, granted superadmin earlier) as approved
-- by adding the column with default true, THEN switching the default to
-- false so every row created after this point (i.e. every self-signup)
-- starts unapproved without needing every insert to say so explicitly.
alter table public.user_roles
  add column if not exists approved boolean not null default true;
alter table public.user_roles alter column approved set default false;

-- A superadmin must now also be approved to count as one — otherwise an
-- unapproved row could theoretically be crafted with role='superadmin' and
-- still pass the old check. (Self-signup only ever writes 'staff', but this
-- keeps the guarantee at the source of truth rather than trusting callers.)
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

-- Lets a superadmin approve a pending signup or change someone's role from
-- the app itself, instead of needing SQL each time.
drop policy if exists "Superadmins update roles" on public.user_roles;
create policy "Superadmins update roles" on public.user_roles
  for update to authenticated using (public.is_superadmin()) with check (true);

-- Extends the earlier "superadmin can delete" pattern (bookings, staff) to
-- the activity log too. It was append-only on purpose (009_activity_log.sql)
-- so history couldn't be tampered with by an ordinary admin — this narrows
-- that door back open for superadmin specifically, rather than removing it.
drop policy if exists "Superadmins delete activity" on public.activity_log;
create policy "Superadmins delete activity" on public.activity_log
  for delete to authenticated using (public.is_superadmin());

-- The one real account so far — already run live, re-runnable.
insert into public.user_roles (user_id, role, approved)
select id, 'superadmin', true from auth.users where email = 'jrnovera@gmail.com'
on conflict (user_id) do update set role = 'superadmin', approved = true;
