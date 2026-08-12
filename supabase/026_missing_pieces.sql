-- Fills in every gap left by the partial run of the original setup script.
-- Found by auditing the live schema against every column/table the app
-- code actually reads — these five were missing:
--
--   1. shop_settings: open_minutes / close_minutes / break_start_minutes /
--      break_end_minutes — causes the error you saw on Settings > Opening
--      Hours ("Could not find the 'break_end_minutes' column...").
--   2. shop_settings: home_service_enabled / home_service_fee — for home
--      service booking availability and call-out fee.
--   3. bookings.addons — used by POS checkout (src/components/PosCheckout.tsx)
--      to ring up extra items at checkout; would fail the same way once you
--      use that screen.
--   4. services.available_at — used by Services & Packages and the New
--      Booking modal to decide whether a service shows for salon vs. home
--      bookings; without it every service silently defaults to "both",
--      which happens to be harmless, but the column write itself would
--      error the moment you save a service.
--
-- Safe to re-run.

-- ---------------------------------------------------------------
-- 1. Opening hours (migration 006)
-- ---------------------------------------------------------------
alter table public.shop_settings
  add column if not exists open_minutes integer not null default 540;   -- 09:00

alter table public.shop_settings
  add column if not exists close_minutes integer not null default 1080; -- 18:00

alter table public.shop_settings
  add column if not exists break_start_minutes integer;

alter table public.shop_settings
  add column if not exists break_end_minutes integer;

alter table public.shop_settings
  add column if not exists home_service_enabled boolean not null default false;

alter table public.shop_settings
  add column if not exists home_service_fee numeric(10, 2) not null default 0;

alter table public.shop_settings
  drop constraint if exists shop_settings_hours_check;

alter table public.shop_settings
  add constraint shop_settings_hours_check check (
    open_minutes >= 0
    and close_minutes <= 1440
    and close_minutes > open_minutes
    and (
      (break_start_minutes is null and break_end_minutes is null)
      or (
        break_start_minutes is not null
        and break_end_minutes is not null
        and break_end_minutes > break_start_minutes
      )
    )
  );

-- ---------------------------------------------------------------
-- 2. POS add-ons / tips (migration 007)
-- ---------------------------------------------------------------
alter table public.bookings
  add column if not exists tip numeric(10, 2) not null default 0;

alter table public.bookings
  add column if not exists addons jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------
-- 3. Home-service availability per service (migration 016, column only —
--    the home-service menu seed rows are optional and not required for
--    the app to function; run 016_home_services.sql separately if you want
--    those too)
-- ---------------------------------------------------------------
alter table public.services
  add column if not exists available_at text not null default 'both';

alter table public.services
  drop constraint if exists services_available_at_check;
alter table public.services
  add constraint services_available_at_check
  check (available_at in ('both', 'salon', 'home'));

create index if not exists services_available_at_idx
  on public.services (available_at);

-- Tell PostgREST to pick up the new columns immediately, rather than
-- waiting for its schema cache to expire on its own.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------
-- Verify — should return 9 rows, one per column above.
-- ---------------------------------------------------------------
select table_name, column_name
from information_schema.columns
where (table_name = 'shop_settings' and column_name in
         ('open_minutes', 'close_minutes', 'break_start_minutes', 'break_end_minutes',
          'home_service_enabled', 'home_service_fee'))
   or (table_name = 'bookings' and column_name in ('tip', 'addons'))
   or (table_name = 'services' and column_name = 'available_at')
order by table_name, column_name;
