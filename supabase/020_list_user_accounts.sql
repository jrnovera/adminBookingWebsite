-- Lets the Team/Accounts screen list every account with its role and
-- approval status. Run in Supabase Dashboard > SQL Editor. Already applied
-- live via the management API on 2026-08-11 — safe to re-run.
--
-- auth.users isn't reachable from the client (no RLS policy grants it, by
-- design — it's Supabase's own table), so a superadmin can't just select
-- email addresses to go with the roles in public.user_roles. This function
-- does the join server-side instead, checking is_superadmin() itself rather
-- than relying on the caller to already be filtered by RLS.
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
  -- Pending signups first — that's the queue a superadmin actually needs to
  -- act on; everyone already approved is reference info below it.
  order by r.approved asc, u.created_at desc;
end;
$$;

grant execute on function public.list_user_accounts() to authenticated;
