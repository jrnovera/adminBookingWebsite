-- Re-issued copy of booking-artisan/supabase/003_no_double_booking.sql —
-- confirmed via a live schema audit that this was never applied to this
-- project: `bookings.slot_range` (the generated column this migration adds)
-- does not exist. Without it, nothing at the database level stops two
-- overlapping bookings for the same staff member — only a client-side
-- availability check, which is a read-then-write race (see comment below).
-- Independent of the voucher/home-service migrations — can run in any order
-- relative to those. Content is otherwise unchanged from the source file.
--
-- Make double-booking impossible at the database level.
-- Safe to re-run.
--
-- The booking site greys out taken slots, but that is a read-then-write check:
-- two people submitting within the same second can both pass it. Only the
-- database can actually refuse the second one, so the rule lives here.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------
-- 1) Parse the stored time label into minutes past midnight.
--    Accepts "10:00 AM" (booking site) and "14:00" (admin).
--    Pure regex parsing only, so it is genuinely IMMUTABLE and may be
--    used by a generated column.
-- ---------------------------------------------------------------
create or replace function public.booking_start_minutes(p_time text)
returns integer
language plpgsql
immutable
as $$
declare
  parts text[];
  hour_part integer;
  minute_part integer;
begin
  if p_time is null then
    return null;
  end if;

  parts := regexp_match(upper(btrim(p_time)), '^(\d{1,2}):(\d{2})\s*(AM|PM)?$');
  if parts is null then
    return null;
  end if;

  hour_part := parts[1]::integer;
  minute_part := parts[2]::integer;

  if parts[3] = 'AM' then
    hour_part := hour_part % 12;
  elsif parts[3] = 'PM' then
    hour_part := (hour_part % 12) + 12;
  end if;

  if hour_part > 23 or minute_part > 59 then
    return null;
  end if;

  return hour_part * 60 + minute_part;
end;
$$;

-- ---------------------------------------------------------------
-- 2) The occupied time range for each booking.
--    Half-open '[)' so a 10:00-11:00 booking does NOT collide with one
--    starting exactly at 11:00. Rows whose time label cannot be parsed get
--    NULL, which exclusion constraints ignore, rather than an unbounded
--    range that would collide with everything.
-- ---------------------------------------------------------------
alter table public.bookings
  drop column if exists slot_range;

alter table public.bookings
  add column slot_range tsrange
  generated always as (
    case
      when public.booking_start_minutes(booking_time) is null then null
      else tsrange(
        booking_date + make_interval(mins => public.booking_start_minutes(booking_time)),
        booking_date + make_interval(
          mins => public.booking_start_minutes(booking_time) + coalesce(duration_minutes, 30)
        ),
        '[)'
      )
    end
  ) stored;

-- ---------------------------------------------------------------
-- 3) Retire pre-existing overlaps so the constraint can be created.
--    Nothing is deleted: the OLDEST booking in each overlapping group is
--    kept and the later ones are cancelled, which is reversible and keeps
--    the row (and its customer details) intact.
-- ---------------------------------------------------------------
with ranked as (
  select b.id,
         row_number() over (
           partition by b.staff_id, b.slot_range
           order by b.created_at, b.id
         ) as position
  from public.bookings b
  where b.status <> 'cancelled'
    and b.slot_range is not null
)
update public.bookings b
set status = 'cancelled'
from ranked r
where b.id = r.id
  and r.position > 1;

-- ---------------------------------------------------------------
-- 4) The actual guarantee: one staff member cannot hold two overlapping
--    live bookings. Cancelled rows are exempt so a slot frees up again.
-- ---------------------------------------------------------------
alter table public.bookings
  drop constraint if exists bookings_no_double_booking;

alter table public.bookings
  add constraint bookings_no_double_booking
  exclude using gist (
    staff_id with =,
    slot_range with &&
  ) where (status <> 'cancelled');

-- The availability view reads slot data; keep it in step with the new column.
create or replace view public.booking_busy_slots
with (security_invoker = false) as
  select staff_id, booking_date, booking_time, duration_minutes
  from public.bookings
  where status <> 'cancelled';

grant select on public.booking_busy_slots to anon, authenticated;
