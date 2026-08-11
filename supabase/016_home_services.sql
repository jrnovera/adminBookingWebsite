-- Home-service catalogue: treatments the team performs at the client's own
-- address, plus the column that decides where a service can be booked.
-- Run in Supabase Dashboard > SQL Editor (after 010_services.sql and
-- booking-artisan/supabase/004_home_service.sql).

-- ---------------------------------------------------------------
-- Where a service can be booked
--
-- 'both' is the default so every service that already exists keeps showing up
-- in the salon exactly as before. The rows seeded below are 'home', which is
-- what makes them invisible to someone booking an in-salon appointment.
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

-- ---------------------------------------------------------------
-- Categories the home menu needs that the salon didn't have.
-- Massage and Nails already exist and are reused.
-- ---------------------------------------------------------------
insert into public.service_categories (name, name_ar, sort_order, active)
select v.name, v.name_ar, v.sort_order, true
from (values
  ('Couple Massage', 'مساج ثنائي', 7),
  ('Wellness', 'العافية', 8),
  ('Madero', 'ماديرو', 9),
  ('Packages', 'الباقات', 10)
) as v(name, name_ar, sort_order)
where not exists (
  select 1 from public.service_categories c where c.name = v.name
);

-- ---------------------------------------------------------------
-- The home-service menu.
--
-- Prices and durations come straight off the printed menu. The nail
-- treatments are the exception: that menu lists prices but no durations, so
-- the values here are estimates — adjust them on the Services & Packages page
-- if they don't match how long the team actually needs, because these drive
-- the slots the booking site offers.
-- ---------------------------------------------------------------
insert into public.services
  (category_id, name, name_ar, description, duration_minutes, price,
   is_package, active, sort_order, available_at)
select
  (select id from public.service_categories where name = v.category),
  v.name, v.name_ar, v.description, v.duration, v.price,
  v.is_package, true, v.sort_order, 'home'
from (values
  -- Massage
  ('Massage', 'Swedish Massage', 'مساج سويدي', null, 60, 199.00, false, 10),
  ('Massage', 'Deep Tissue Massage', 'مساج الأنسجة العميقة', null, 90, 249.00, false, 20),
  ('Massage', 'Combination Massage', 'مساج مدمج', null, 120, 299.00, false, 30),

  -- Couple massage: two therapists attend, hence roughly double the price.
  ('Couple Massage', 'Couple Swedish Massage', 'مساج سويدي للثنائي', null, 60, 349.00, false, 10),
  ('Couple Massage', 'Couple Deep Tissue Massage', 'مساج الأنسجة العميقة للثنائي', null, 90, 449.00, false, 20),
  ('Couple Massage', 'Couple Combination Massage', 'مساج مدمج للثنائي', null, 120, 599.00, false, 30),

  -- Wellness
  ('Wellness', 'Lymphatic Drainage', 'تصريف لمفاوي', null, 60, 250.00, false, 10),
  ('Wellness', 'Prenatal Massage', 'مساج ما قبل الولادة', null, 60, 199.00, false, 20),
  ('Wellness', 'Postpartum Massage', 'مساج ما بعد الولادة', null, 60, 180.00, false, 30),

  -- Nails (durations estimated — see note above)
  ('Nails', 'Classic Manicure (Home)', 'مانيكير كلاسيكي', null, 45, 99.00, false, 200),
  ('Nails', 'Classic Pedicure (Home)', 'باديكير كلاسيكي', null, 45, 99.00, false, 210),
  ('Nails', 'Callus Removal (Home)', 'إزالة الجلد الميت', null, 30, 99.00, false, 220),

  -- Madero therapy
  ('Madero', 'Madero Therapy 30 min', 'علاج ماديرو ٣٠ دقيقة', null, 30, 149.00, false, 10),
  ('Madero', 'Madero Therapy 60 min', 'علاج ماديرو ٦٠ دقيقة', null, 60, 299.00, false, 20),
  ('Madero', 'Madero + Massage', 'ماديرو مع مساج', null, 90, 399.00, false, 30),

  -- Special package: 30 + 20 + 40 minutes of treatment back to back.
  ('Packages', 'Special Package',
   'الباقة الخاصة',
   'Head & Shoulder Massage (30 min) + Classic Foot Spa (20 min) + Classic Manicure & Pedicure (40 min)',
   90, 249.00, true, 10)
) as v(category, name, name_ar, description, duration, price, is_package, sort_order)
where not exists (
  select 1 from public.services s where s.name = v.name
);
