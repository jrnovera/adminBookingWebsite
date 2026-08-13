-- The live bookings table has drifted from booking-artisan/supabase/schema.sql —
-- columns like 'locale' and 'price' were missing, breaking inserts from the
-- booking site. Rather than patching one column at a time as errors surface,
-- this backfills every column the reference schema expects, all guarded with
-- IF NOT EXISTS so it's safe to re-run and won't touch columns that already exist.

alter table public.bookings add column if not exists service_id text;
alter table public.bookings add column if not exists service_name text;
alter table public.bookings add column if not exists duration_minutes integer;
alter table public.bookings add column if not exists price numeric(10, 2) not null default 0;

alter table public.bookings add column if not exists staff_id text;
alter table public.bookings add column if not exists staff_name text;

alter table public.bookings add column if not exists booking_date date;
alter table public.bookings add column if not exists booking_time text;

alter table public.bookings add column if not exists subtotal numeric(10, 2) not null default 0;
alter table public.bookings add column if not exists tax numeric(10, 2) not null default 0;
alter table public.bookings add column if not exists total numeric(10, 2) not null default 0;
alter table public.bookings add column if not exists discount numeric(10, 2) not null default 0;
alter table public.bookings add column if not exists currency text not null default 'AED';

alter table public.bookings add column if not exists full_name text;
alter table public.bookings add column if not exists email text;
alter table public.bookings add column if not exists mobile text;
alter table public.bookings add column if not exists address text;
alter table public.bookings add column if not exists notes text;
alter table public.bookings add column if not exists voucher_code text;

alter table public.bookings add column if not exists locale text not null default 'en';
