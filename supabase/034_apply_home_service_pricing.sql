-- Re-issued copy of booking-artisan/supabase/004_home_service.sql. MUST run
-- AFTER 032_apply_booking_vouchers.sql (this file's trigger calls
-- validate_voucher(), which 032 creates) — run 032, then this file.
--
-- Why this is needed even though `bookings.home_service_fee` and
-- `service_location` already exist on this project: those columns were
-- added by an ad-hoc fix at some point (this file's own ALTER TABLE ... ADD
-- COLUMN IF NOT EXISTS lines are therefore no-ops here, harmless), but the
-- pricing TRIGGER this file defines was never installed. Confirmed via
-- audit: the booking site's insert (src/components/DetailsForm.tsx) relies
-- on a database trigger to (a) validate/apply the voucher server-side and
-- (b) stamp home_service_fee from shop_settings rather than trust the
-- client — its own comment says "the insert trigger rejects the booking
-- outright if the code doesn't check out", but with no trigger installed,
-- ANY voucher_code is currently accepted unvalidated, and home bookings
-- never get home_service_fee stamped (the total charged is still correct
-- today only because the client computes and sends it directly — this
-- migration is what makes the server actually enforce it instead of
-- trusting the client). This version of the trigger supersedes and replaces
-- the simpler one 032 creates — that's expected, 032 must just run first so
-- validate_voucher() exists for this trigger to call.
--
-- Home services: a booking can be fulfilled at the salon or at the customer's
-- address, with a flat call-out fee added to home visits.
-- Run in Supabase Dashboard > SQL Editor.

-- ---------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------
alter table public.bookings
  add column if not exists service_location text not null default 'salon';

alter table public.bookings
  drop constraint if exists bookings_service_location_check;
alter table public.bookings
  add constraint bookings_service_location_check
  check (service_location in ('salon', 'home'));

-- Stamped by the trigger below from shop_settings, never from the client.
alter table public.bookings
  add column if not exists home_service_fee numeric(10, 2) not null default 0;

-- `address` is optional for salon visits but is the whole point of a home one,
-- so the database refuses a home booking that has nowhere to send staff.
alter table public.bookings
  drop constraint if exists bookings_home_needs_address;
alter table public.bookings
  add constraint bookings_home_needs_address check (
    service_location <> 'home'
    or (address is not null and btrim(address) <> '')
  );

create index if not exists bookings_service_location_idx
  on public.bookings (service_location);

-- ---------------------------------------------------------------
-- Shop settings: the fee itself, editable in the admin app
-- ---------------------------------------------------------------
alter table public.shop_settings
  add column if not exists home_service_enabled boolean not null default true;

alter table public.shop_settings
  add column if not exists home_service_fee numeric(10, 2) not null default 0;

alter table public.shop_settings
  drop constraint if exists shop_settings_home_fee_check;
alter table public.shop_settings
  add constraint shop_settings_home_fee_check check (home_service_fee >= 0);

-- ---------------------------------------------------------------
-- Pricing trigger
--
-- This replaces the body of bookings_apply_voucher (008_booking_vouchers.sql).
-- That version recomputed tax and total from subtotal and discount alone, so a
-- call-out fee sent by the client would have been silently erased on insert.
-- The fee is now read from shop_settings for the same reason the discount is
-- recomputed here: the client must not be able to invent its own price. A
-- customer who tampers with the request gets the configured fee regardless, and
-- a home booking made while the feature is switched off is rejected outright.
--
-- VAT is charged on the fee as well as the service, so tax is taken after the
-- fee is added rather than before.
-- ---------------------------------------------------------------
create or replace function public.bookings_apply_voucher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discount numeric(10, 2) := 0;
  v_code text;
  v_net numeric(10, 2);
  v_fee numeric(10, 2) := 0;
  v_enabled boolean := true;
begin
  if new.voucher_code is null or btrim(new.voucher_code) = '' then
    new.voucher_code := null;
    new.discount := 0;
  else
    select vv.code, vv.discount into v_code, v_discount
    from public.validate_voucher(new.voucher_code, new.subtotal) vv;

    -- Store the canonical code as configured in the admin app.
    new.voucher_code := v_code;
    new.discount := v_discount;

    update public.promos
    set times_used = times_used + 1
    where upper(code) = upper(v_code);
  end if;

  if new.service_location = 'home' then
    select s.home_service_enabled, s.home_service_fee
      into v_enabled, v_fee
    from public.shop_settings s
    where s.id is true;

    if not coalesce(v_enabled, false) then
      raise exception 'HOME_SERVICE_DISABLED' using errcode = 'P0001';
    end if;

    new.home_service_fee := round(coalesce(v_fee, 0), 2);
  else
    new.home_service_fee := 0;
  end if;

  -- Discount applies to the service only; the call-out fee is not discountable.
  v_net := round(new.subtotal, 2) - new.discount + new.home_service_fee;
  new.tax := round(v_net * 0.05, 2);
  new.total := v_net + new.tax;
  return new;
end;
$$;

drop trigger if exists bookings_apply_voucher on public.bookings;
create trigger bookings_apply_voucher
  before insert on public.bookings
  for each row execute function public.bookings_apply_voucher();
