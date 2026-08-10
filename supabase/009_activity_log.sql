-- Activity history: an append-only record of every change an admin makes.
-- Run in Supabase Dashboard > SQL Editor. Safe to re-run.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor text,
  entity text not null,
  entity_id text,
  action text not null,
  summary text not null,
  detail text
);

create index if not exists activity_log_created_idx
  on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "Admins read activity" on public.activity_log;
create policy "Admins read activity" on public.activity_log
  for select to authenticated using (true);

-- Append-only: no update or delete policy on purpose, so history cannot be
-- quietly rewritten from the app.
drop policy if exists "Admins write activity" on public.activity_log;
create policy "Admins write activity" on public.activity_log
  for insert to authenticated with check (true);

notify pgrst, 'reload schema';
