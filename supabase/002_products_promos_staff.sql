-- Artisan Admin: inventory, promos and seed staff.
-- Run in Supabase Dashboard > SQL Editor.

-- ---------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  sku text,
  category text not null default 'Retail',
  price numeric(10, 2) not null default 0,
  cost numeric(10, 2) not null default 0,
  stock integer not null default 0,
  low_stock_at integer not null default 5,
  active boolean not null default true
);

-- ---------------------------------------------------------------
-- Promos
-- ---------------------------------------------------------------
create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null unique,
  description text,
  discount_type text not null default 'percent'
    check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10, 2) not null default 0,
  starts_on date,
  ends_on date,
  usage_limit integer,
  times_used integer not null default 0,
  active boolean not null default true
);

-- ---------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------
alter table public.products enable row level security;
alter table public.promos enable row level security;

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
  for all to authenticated using (true) with check (true);

drop policy if exists "Admins manage promos" on public.promos;
create policy "Admins manage promos" on public.promos
  for all to authenticated using (true) with check (true);

-- Booking site may check a promo code it was given.
drop policy if exists "Public reads active promos" on public.promos;
create policy "Public reads active promos" on public.promos
  for select to anon using (active);

-- ---------------------------------------------------------------
-- Seed: 6 staff for testing
-- ---------------------------------------------------------------
insert into public.staff (name, role, email, phone, work_start, work_end, days_off)
values
  ('Emma Johnson',  'Senior Hair Stylist', 'emma@artisan.test',   '+971 50 111 0001', '09:00', '18:00', '{0}'),
  ('Sophia Carter', 'Colour Specialist',   'sophia@artisan.test', '+971 50 111 0002', '10:00', '19:00', '{0,1}'),
  ('Liam Anderson', 'Barber',              'liam@artisan.test',   '+971 50 111 0003', '09:00', '17:00', '{5}'),
  ('Olivia Brown',  'Nail Technician',     'olivia@artisan.test', '+971 50 111 0004', '10:00', '18:00', '{0}'),
  ('Mia Thomas',    'Facialist',           'mia@artisan.test',    '+971 50 111 0005', '11:00', '20:00', '{2}'),
  ('Noah Wilson',   'Massage Therapist',   'noah@artisan.test',   '+971 50 111 0006', '09:00', '18:00', '{0,6}')
on conflict do nothing;

-- ---------------------------------------------------------------
-- Seed: a few products so Inventory has data
-- ---------------------------------------------------------------
insert into public.products (name, sku, category, price, cost, stock, low_stock_at)
values
  ('Shampoo 300ml',     'SHP-300', 'Hair Care', 45.00, 22.00, 12, 5),
  ('Conditioner 300ml', 'CND-300', 'Hair Care', 45.00, 22.00,  5, 5),
  ('Hair Mask',         'MSK-200', 'Hair Care', 70.00, 35.00,  0, 3),
  ('Argan Serum',       'SRM-050', 'Hair Care', 95.00, 48.00,  8, 4),
  ('Hair Spray',        'SPR-250', 'Styling',   38.00, 18.00, 15, 5)
on conflict do nothing;
