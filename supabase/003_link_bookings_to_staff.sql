-- Relink existing bookings onto real staff rows.
-- Run AFTER 002_products_promos_staff.sql (which seeds the 6 staff).

-- 1) Match by name where the booking already names one of your staff.
update public.bookings b
set staff_id = s.id::text,
    staff_name = s.name
from public.staff s
where lower(b.staff_name) = lower(s.name);

-- 2) Anything still unmatched gets spread across the 6 staff so the
--    calendar has data in every column.
with numbered as (
  select b.id,
         row_number() over (order by b.booking_date, b.booking_time, b.id) as rn
  from public.bookings b
  where b.staff_id not in (select id::text from public.staff)
),
roster as (
  select s.id, s.name,
         row_number() over (order by s.name) as rn
  from public.staff s
)
update public.bookings b
set staff_id = r.id::text,
    staff_name = r.name
from numbered n
join roster r
  on r.rn = ((n.rn - 1) % (select count(*) from roster)) + 1
where b.id = n.id;

-- 3) Check the result.
select b.booking_date, b.booking_time, b.full_name, b.staff_name, b.status
from public.bookings b
order by b.booking_date, b.booking_time;
