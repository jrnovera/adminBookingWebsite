-- Manual availability blocks: lets an admin block a staff member for a
-- specific date/time range (lunch, personal appointment, etc.) without
-- creating a fake booking. Safe to re-run.

create table if not exists public.staff_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  block_date date not null,
  start_minutes integer not null check (start_minutes >= 0 and start_minutes < 1440),
  end_minutes integer not null check (end_minutes > start_minutes and end_minutes <= 1440),
  reason text
);

create index if not exists staff_blocks_staff_date_idx
  on public.staff_blocks (staff_id, block_date);

alter table public.staff_blocks enable row level security;

drop policy if exists "Admins manage staff blocks" on public.staff_blocks;
create policy "Admins manage staff blocks" on public.staff_blocks
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------
-- Same pattern as booking_busy_slots / staff_time_off_public: the booking
-- site (anon key) needs to know which windows are blocked so it can grey
-- out slots, but there's nothing sensitive in this table to hide.
-- ---------------------------------------------------------------
create or replace view public.staff_blocks_public
with (security_invoker = false) as
  select staff_id, block_date, start_minutes, end_minutes
  from public.staff_blocks;

grant select on public.staff_blocks_public to anon, authenticated;

-- Prevent a block from overlapping another block on the same staff member.
create extension if not exists btree_gist;

alter table public.staff_blocks
  drop column if exists minute_range;

alter table public.staff_blocks
  add column minute_range int4range
  generated always as (int4range(start_minutes, end_minutes, '[)')) stored;

alter table public.staff_blocks
  drop constraint if exists staff_blocks_no_overlap;

alter table public.staff_blocks
  add constraint staff_blocks_no_overlap
  exclude using gist (
    staff_id with =,
    block_date with =,
    minute_range with &&
  );
