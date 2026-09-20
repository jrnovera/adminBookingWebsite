-- Base bookings table.
--
-- Reconstructed from the columns every later migration assumes: the original
-- project created this table outside the migration files (dashboard/SQL
-- editor), so a fresh database had nothing for 003 onward to alter and the
-- whole run failed at the first reference to public.bookings.
--
-- Column list mirrors the Booking type in src/lib/types.ts. Everything here is
-- also re-added defensively by 029_backfill_missing_booking_columns.sql, so
-- running both is harmless.
--
-- slot_range is deliberately NOT declared here — 033 drops and recreates it as
-- a generated column and must own it.
--
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- what was booked
  service_id text,
  service_name text,
  duration_minutes integer,
  price numeric(10, 2) not null default 0,

  -- who performs it (text, not a FK — 003 backfills these from public.staff)
  staff_id text,
  staff_name text,

  -- when
  booking_date date,
  booking_time text,

  -- money
  subtotal numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  tip numeric(10, 2) not null default 0,
  home_service_fee numeric(10, 2) not null default 0,
  addons jsonb not null default '[]'::jsonb,
  currency text not null default 'AED',
  voucher_code text,

  -- customer
  full_name text,
  email text,
  mobile text,
  address text,
  notes text,
  locale text not null default 'en',

  -- state
  service_location text not null default 'salon',
  status text not null default 'pending',
  is_paid boolean not null default false,
  payment_method text,
  paid_at timestamptz
);

create index if not exists bookings_booking_date_idx on public.bookings (booking_date);
create index if not exists bookings_staff_id_idx on public.bookings (staff_id);
create index if not exists bookings_email_idx on public.bookings (lower(email));
