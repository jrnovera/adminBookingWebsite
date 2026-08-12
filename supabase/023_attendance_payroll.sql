-- Attendance tracking and payroll computation.
-- Safe to re-run.

-- ---------------------------------------------------------------
-- Staff: pay setup
-- ---------------------------------------------------------------
alter table public.staff add column if not exists salary_type text not null default 'monthly';
alter table public.staff drop constraint if exists staff_salary_type_check;
alter table public.staff add constraint staff_salary_type_check
  check (salary_type in ('monthly', 'hourly'));

-- Monthly basic pay (salary_type = 'monthly') or the hourly rate
-- (salary_type = 'hourly') — only one of the two is used, depending on
-- salary_type, but both are kept so switching a staff member between the
-- two doesn't lose whichever number isn't currently active.
alter table public.staff add column if not exists base_salary numeric(10, 2) not null default 0;
alter table public.staff add column if not exists hourly_rate numeric(10, 2) not null default 0;

-- ---------------------------------------------------------------
-- Attendance: one row per staff member per calendar day
-- ---------------------------------------------------------------
create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  attendance_date date not null,
  status text not null default 'present',
  time_in time,
  time_out time,
  notes text,
  unique (staff_id, attendance_date)
);

alter table public.staff_attendance drop constraint if exists staff_attendance_status_check;
alter table public.staff_attendance add constraint staff_attendance_status_check
  check (status in ('present', 'late', 'half_day', 'on_leave', 'absent'));

create index if not exists staff_attendance_date_idx
  on public.staff_attendance (attendance_date);
create index if not exists staff_attendance_staff_idx
  on public.staff_attendance (staff_id);

-- ---------------------------------------------------------------
-- Payroll incentives / deductions: free-form line items per staff member,
-- scoped to the month they should be paid in (first-of-month date, e.g.
-- 2026-08-01) so a bonus or a deduction can be added ad hoc and still show
-- up on the right payslip.
-- ---------------------------------------------------------------
create table if not exists public.staff_incentives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  period_month date not null,
  label text not null,
  amount numeric(10, 2) not null,
  kind text not null default 'bonus',
  notes text
);

alter table public.staff_incentives drop constraint if exists staff_incentives_kind_check;
alter table public.staff_incentives add constraint staff_incentives_kind_check
  check (kind in ('bonus', 'commission', 'deduction'));
alter table public.staff_incentives drop constraint if exists staff_incentives_amount_check;
alter table public.staff_incentives add constraint staff_incentives_amount_check
  check (amount >= 0);

create index if not exists staff_incentives_period_idx
  on public.staff_incentives (period_month);
create index if not exists staff_incentives_staff_idx
  on public.staff_incentives (staff_id);

-- ---------------------------------------------------------------
-- Payroll runs: marks a staff member's month as paid, so re-opening the
-- payroll page later shows a settled state instead of a re-computed one
-- that could drift if attendance is edited afterwards.
-- ---------------------------------------------------------------
create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  period_month date not null,
  gross_pay numeric(10, 2) not null,
  incentives_total numeric(10, 2) not null default 0,
  deductions_total numeric(10, 2) not null default 0,
  net_pay numeric(10, 2) not null,
  paid_at timestamptz not null default now(),
  paid_by text,
  unique (staff_id, period_month)
);

-- ---------------------------------------------------------------
-- Row level security — same shape as the rest of the app: signed-in admins
-- manage everything, nothing here is public.
-- ---------------------------------------------------------------
alter table public.staff_attendance enable row level security;
alter table public.staff_incentives enable row level security;
alter table public.payroll_runs enable row level security;

drop policy if exists "Admins manage attendance" on public.staff_attendance;
create policy "Admins manage attendance" on public.staff_attendance
  for all to authenticated using (true) with check (true);

drop policy if exists "Admins manage incentives" on public.staff_incentives;
create policy "Admins manage incentives" on public.staff_incentives
  for all to authenticated using (true) with check (true);

drop policy if exists "Admins manage payroll runs" on public.payroll_runs;
create policy "Admins manage payroll runs" on public.payroll_runs
  for all to authenticated using (true) with check (true);
