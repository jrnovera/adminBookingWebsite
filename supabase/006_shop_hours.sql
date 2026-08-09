-- Shop-wide opening hours and a daily break (e.g. lunch), configured in
-- admin Settings and honoured by both the admin calendar and the booking
-- site. Safe to re-run.
--
-- Minutes past midnight, same convention as staff_blocks.

alter table public.shop_settings
  add column if not exists open_minutes integer not null default 540;   -- 09:00

alter table public.shop_settings
  add column if not exists close_minutes integer not null default 1080; -- 18:00

-- Break is optional: both null = no break.
alter table public.shop_settings
  add column if not exists break_start_minutes integer;

alter table public.shop_settings
  add column if not exists break_end_minutes integer;

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
-- The booking site (anon) already reads shop_settings via the
-- "Public reads settings" policy from migration 004, so the new
-- columns are available to it with no extra grant.
-- ---------------------------------------------------------------
