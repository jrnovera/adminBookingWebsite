-- Pay cutoff frequency: some staff are paid weekly, some semi-monthly
-- (1st–15th / 16th–end), some monthly. Safe to re-run.
--
-- staff_incentives.period_month and payroll_runs.period_month already store
-- a plain date with no format assumption baked into the schema — for
-- weekly/semi-monthly staff the app now puts the exact cutoff start date in
-- that column instead of always the 1st of the month, so no column rename
-- is needed here, just this new field to decide which cutoff shape applies.

alter table public.staff add column if not exists pay_frequency text not null default 'monthly';

alter table public.staff drop constraint if exists staff_pay_frequency_check;
alter table public.staff add constraint staff_pay_frequency_check
  check (pay_frequency in ('weekly', 'semi_monthly', 'monthly'));
