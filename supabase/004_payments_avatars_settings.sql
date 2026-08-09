-- Payments on bookings, staff photos, shop settings and storage buckets.
-- Safe to re-run.

-- ---------------------------------------------------------------
-- Bookings: payment tracking
-- ---------------------------------------------------------------
alter table public.bookings add column if not exists is_paid boolean not null default false;
alter table public.bookings add column if not exists payment_method text;
alter table public.bookings add column if not exists paid_at timestamptz;
alter table public.bookings add column if not exists status text not null default 'pending';

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));

-- Admin app creates walk-in / phone bookings too.
drop policy if exists "Admins create bookings" on public.bookings;
create policy "Admins create bookings" on public.bookings
  for insert to authenticated with check (true);

drop policy if exists "Admins delete bookings" on public.bookings;
create policy "Admins delete bookings" on public.bookings
  for delete to authenticated using (true);

-- ---------------------------------------------------------------
-- Staff photos
-- ---------------------------------------------------------------
alter table public.staff add column if not exists avatar_url text;

-- ---------------------------------------------------------------
-- Shop settings (single row)
-- ---------------------------------------------------------------
create table if not exists public.shop_settings (
  id boolean primary key default true check (id),
  updated_at timestamptz not null default now(),
  shop_name text not null default 'Artisan Salon & Spa',
  logo_url text,
  email text,
  phone text,
  address text,
  currency text not null default 'AED',
  tax_rate numeric(5, 2) not null default 5.00
);

insert into public.shop_settings (id) values (true) on conflict (id) do nothing;

alter table public.shop_settings enable row level security;

drop policy if exists "Admins manage settings" on public.shop_settings;
create policy "Admins manage settings" on public.shop_settings
  for all to authenticated using (true) with check (true);

drop policy if exists "Public reads settings" on public.shop_settings;
create policy "Public reads settings" on public.shop_settings
  for select to anon using (true);

-- ---------------------------------------------------------------
-- Storage: public buckets for staff photos and the shop logo
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('staff-photos', 'staff-photos', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('shop-assets', 'shop-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Public reads staff photos" on storage.objects;
create policy "Public reads staff photos" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('staff-photos', 'shop-assets'));

drop policy if exists "Admins upload assets" on storage.objects;
create policy "Admins upload assets" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('staff-photos', 'shop-assets'));

drop policy if exists "Admins update assets" on storage.objects;
create policy "Admins update assets" on storage.objects
  for update to authenticated
  using (bucket_id in ('staff-photos', 'shop-assets'))
  with check (bucket_id in ('staff-photos', 'shop-assets'));

drop policy if exists "Admins delete assets" on storage.objects;
create policy "Admins delete assets" on storage.objects
  for delete to authenticated
  using (bucket_id in ('staff-photos', 'shop-assets'));
