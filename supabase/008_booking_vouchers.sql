-- Make the booking site's voucher field functional against the promos table.
-- Run in Supabase Dashboard > SQL Editor (after 002_products_promos_staff.sql).

-- ---------------------------------------------------------------
-- Bookings: record the discount that was granted
-- ---------------------------------------------------------------
alter table public.bookings
  add column if not exists discount numeric(10, 2) not null default 0;

-- ---------------------------------------------------------------
-- Voucher lookup used by the public booking site.
-- Security definer so the anon role can check usage limits / dates
-- without being able to read or write the promos table directly.
-- ---------------------------------------------------------------
create or replace function public.validate_voucher(
  p_code text,
  p_subtotal numeric
)
returns table (
  code text,
  description text,
  discount_type text,
  discount_value numeric,
  discount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.promos%rowtype;
  v_discount numeric(10, 2);
begin
  if p_code is null or btrim(p_code) = '' then
    raise exception 'VOUCHER_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v
  from public.promos p
  where upper(p.code) = upper(btrim(p_code))
  limit 1;

  if not found or not v.active then
    raise exception 'VOUCHER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v.starts_on is not null and current_date < v.starts_on then
    raise exception 'VOUCHER_NOT_STARTED' using errcode = 'P0001';
  end if;

  if v.ends_on is not null and current_date > v.ends_on then
    raise exception 'VOUCHER_EXPIRED' using errcode = 'P0001';
  end if;

  if v.usage_limit is not null and v.times_used >= v.usage_limit then
    raise exception 'VOUCHER_USED_UP' using errcode = 'P0001';
  end if;

  if v.discount_type = 'percent' then
    v_discount := round(coalesce(p_subtotal, 0) * v.discount_value / 100.0, 2);
  else
    v_discount := round(v.discount_value, 2);
  end if;

  -- Never discount below zero.
  v_discount := least(greatest(v_discount, 0), round(coalesce(p_subtotal, 0), 2));

  return query
  select v.code, v.description, v.discount_type, v.discount_value, v_discount;
end;
$$;

grant execute on function public.validate_voucher(text, numeric) to anon, authenticated;

-- ---------------------------------------------------------------
-- Server-side enforcement: recompute discount / tax / total on insert
-- so a tampered client cannot invent its own discount, and count the
-- redemption against the promo's usage limit.
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

  v_net := round(new.subtotal, 2) - new.discount;
  new.tax := round(v_net * 0.05, 2);
  new.total := v_net + new.tax;
  return new;
end;
$$;

drop trigger if exists bookings_apply_voucher on public.bookings;
create trigger bookings_apply_voucher
  before insert on public.bookings
  for each row execute function public.bookings_apply_voucher();
