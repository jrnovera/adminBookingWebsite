-- Artisan Admin schema additions.
-- Run in Supabase Dashboard > SQL Editor.

-- ---------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  role text not null default 'Stylist',
  email text,
  phone text,
  active boolean not null default true,
  work_start text not null default '09:00',
  work_end text not null default '18:00',
  -- 0 = Sunday … 6 = Saturday
  days_off smallint[] not null default '{0}'
);

create table if not exists public.staff_time_off (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  check (end_date >= start_date)
);

create index if not exists staff_time_off_staff_id_idx
  on public.staff_time_off (staff_id);

-- ---------------------------------------------------------------
-- Row level security
-- Public booking site (anon) may only create bookings.
-- Everything else requires a signed-in admin user.
-- ---------------------------------------------------------------
alter table public.bookings enable row level security;
alter table public.staff enable row level security;
alter table public.staff_time_off enable row level security;

drop policy if exists "Allow public insert" on public.bookings;
create policy "Allow public insert" on public.bookings
  for insert to anon with check (true);

drop policy if exists "Allow public read" on public.bookings;
drop policy if exists "Allow public update" on public.bookings;

drop policy if exists "Admins read bookings" on public.bookings;
create policy "Admins read bookings" on public.bookings
  for select to authenticated using (true);

drop policy if exists "Admins update bookings" on public.bookings;
create policy "Admins update bookings" on public.bookings
  for update to authenticated using (true) with check (true);

drop policy if exists "Admins manage staff" on public.staff;
create policy "Admins manage staff" on public.staff
  for all to authenticated using (true) with check (true);

-- Booking site needs to list bookable staff.
drop policy if exists "Public reads active staff" on public.staff;
create policy "Public reads active staff" on public.staff
  for select to anon using (active);

drop policy if exists "Admins manage time off" on public.staff_time_off;
create policy "Admins manage time off" on public.staff_time_off
  for all to authenticated using (true) with check (true);
