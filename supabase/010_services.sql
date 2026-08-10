-- Artisan Admin: service categories, services and packages.
-- Run in Supabase Dashboard > SQL Editor.

-- ---------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  name_ar text,
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true
);

-- ---------------------------------------------------------------
-- Services & packages
-- A "package" is just a service row with is_package = true — it bundles
-- multiple treatments under one bookable price/duration, so it reuses the
-- same table rather than a parallel schema.
-- ---------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category_id uuid references public.service_categories (id) on delete set null,
  name text not null,
  name_ar text,
  description text,
  duration_minutes integer not null default 30,
  price numeric(10, 2) not null default 0,
  image_url text,
  is_package boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0
);

create index if not exists services_category_id_idx
  on public.services (category_id);

-- ---------------------------------------------------------------
-- Row level security
-- Admin app manages everything; the public booking site may only read
-- active rows so it can list categories/services and packages to book.
-- ---------------------------------------------------------------
alter table public.service_categories enable row level security;
alter table public.services enable row level security;

drop policy if exists "Admins manage service categories" on public.service_categories;
create policy "Admins manage service categories" on public.service_categories
  for all to authenticated using (true) with check (true);

drop policy if exists "Public reads active service categories" on public.service_categories;
create policy "Public reads active service categories" on public.service_categories
  for select to anon using (active);

drop policy if exists "Admins manage services" on public.services;
create policy "Admins manage services" on public.services
  for all to authenticated using (true) with check (true);

drop policy if exists "Public reads active services" on public.services;
create policy "Public reads active services" on public.services
  for select to anon using (active);

-- ---------------------------------------------------------------
-- Seed: carry over the categories the booking site used to hardcode, so
-- existing bookings/UI have somewhere to land after the migration.
-- ---------------------------------------------------------------
insert into public.service_categories (name, name_ar, sort_order)
values
  ('Hair', 'الشعر', 1),
  ('Nails', 'الأظافر', 2),
  ('Facial', 'العناية بالوجه', 3),
  ('Waxing', 'الشمع', 4),
  ('Brows & Lashes', 'الحواجب والرموش', 5),
  ('Massage', 'المساج', 6)
on conflict do nothing;
