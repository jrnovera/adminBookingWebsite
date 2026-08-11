-- Third role tier: staff (front-desk day-to-day access, below admin).
-- Run in Supabase Dashboard > SQL Editor. Already applied live via the
-- management API on 2026-08-11 — this file just keeps the schema history
-- reproducible; it's safe to re-run.

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('staff', 'admin', 'superadmin'));

-- jrnovera@gmail.com is the working superadmin account (admin@gmail.com from
-- 017 was never actually created — see chat history). Re-runnable.
insert into public.user_roles (user_id, role)
select id, 'superadmin' from auth.users where email = 'jrnovera@gmail.com'
on conflict (user_id) do update set role = 'superadmin';
