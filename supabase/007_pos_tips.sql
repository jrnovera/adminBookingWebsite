-- POS: record add-ons and tips against a booking so the billing total
-- reflects what was actually charged. Safe to re-run.

alter table public.bookings
  add column if not exists tip numeric(10, 2) not null default 0;

-- Extra items rung up at checkout (retail products, add-on services).
-- [{ name, price, qty }]
alter table public.bookings
  add column if not exists addons jsonb not null default '[]'::jsonb;
