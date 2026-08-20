-- Make 'developer' a true superset of 'superadmin' at the database level.
--
-- 037 added the developer role and its page_visibility controls, but every
-- existing server-side gate still tested `role = 'superadmin'` literally:
--
--   * public.is_superadmin()      — used by list_user_accounts() and by the
--                                   delete/update RLS policies on bookings,
--                                   staff and user_roles
--
-- The result: a developer account opened the Accounts page (the app's own
-- isSuperAdmin already counted developer) but every call it made came back
-- FORBIDDEN — the list was empty and creating an account failed with "Only
-- a superadmin can create accounts". This aligns the database with what the
-- app already assumes.
--
-- The three Edge Functions (create-account, delete-account, update-account)
-- carry the same fix in their own code and must be redeployed separately:
--   supabase functions deploy create-account delete-account update-account
--
-- Run in Supabase Dashboard > SQL Editor. Safe to re-run.

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid()
      and r.role in ('superadmin', 'developer')
      and r.approved
  );
$$;

grant execute on function public.is_superadmin() to authenticated;

-- Sanity check — should list every superadmin/developer account.
select u.email, r.role, r.approved
from public.user_roles r
join auth.users u on u.id = r.user_id
where r.role in ('superadmin', 'developer');
