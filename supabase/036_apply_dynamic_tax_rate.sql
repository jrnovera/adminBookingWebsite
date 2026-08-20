-- The booking insert trigger (bookings_apply_voucher, most recently
-- redefined in 034_apply_home_service_pricing.sql) hardcoded VAT at 0.05
-- regardless of what shop_settings.tax_rate says. Settings > Tax rate (%)
-- has always saved and displayed correctly, but changing it there never
-- actually changed what a booking was charged server-side — the trigger
-- silently overwrote whatever tax the client sent with a fixed 5%. This
-- migration is the trigger reading shop_settings.tax_rate like every other
-- admin screen (PosCheckout, NewBookingModal, BookingDrawer) already does.
--
-- Run in Supabase Dashboard > SQL Editor, on both the admin and the public
-- booking site's project (same database, so only needs running once).

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
  v_tax_rate numeric(5, 2) := 5.00;
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

  select coalesce(s.tax_rate, 5.00) into v_tax_rate
  from public.shop_settings s
  where s.id is true;

  -- Discount applies to the service only; the call-out fee is not discountable.
  v_net := round(new.subtotal, 2) - new.discount + new.home_service_fee;
  new.tax := round(v_net * (v_tax_rate / 100.0), 2);
  new.total := v_net + new.tax;
  return new;
end;
$$;

-- Trigger definition is unchanged, but re-issued for clarity/idempotency.
drop trigger if exists bookings_apply_voucher on public.bookings;
create trigger bookings_apply_voucher
  before insert on public.bookings
  for each row execute function public.bookings_apply_voucher();
