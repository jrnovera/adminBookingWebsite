import { getSupabaseClient } from "./supabase";
import { monthRange } from "./attendance";
import {
  addDays,
  addMonths,
  periodsForFrequency,
  toDateKey,
  toMonthKey,
  type PayPeriod,
} from "./format";
import type {
  AttendanceStatus,
  IncentiveKind,
  PayrollRun,
  Staff,
  StaffAttendance,
  StaffIncentive,
} from "./types";

export const incentiveKindLabels: Record<IncentiveKind, string> = {
  bonus: "Bonus",
  commission: "Commission",
  deduction: "Deduction",
};

// ---------------------------------------------------------------
// Incentives (bonuses, commission, deductions)
// ---------------------------------------------------------------

/** Every incentive whose period key falls in this displayed month — a period
 * key is always a date within its own month by construction (see
 * lib/format.ts periodsForFrequency), so this range covers every frequency
 * without needing to know each staff member's pay_frequency up front. */
export async function fetchIncentivesForMonth(
  monthKey: string
): Promise<StaffIncentive[]> {
  const { start, end } = monthRange(monthKey);
  const { data, error } = await getSupabaseClient()
    .from("staff_incentives")
    .select("*")
    .gte("period_month", start)
    .lte("period_month", end)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as StaffIncentive[];
}

export type IncentiveInput = {
  staff_id: string;
  /** A PayPeriod's `key` — the specific cutoff this line item counts
   * toward, not necessarily the 1st of the month (see lib/format.ts). */
  period_month: string;
  label: string;
  amount: number;
  kind: IncentiveKind;
  notes?: string | null;
};

export async function addIncentive(input: IncentiveInput) {
  const { error } = await getSupabaseClient()
    .from("staff_incentives")
    .insert(input);
  if (error) throw new Error(error.message);
}

export async function deleteIncentive(id: string) {
  const { error } = await getSupabaseClient()
    .from("staff_incentives")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------
// Payroll runs (marking a period paid)
// ---------------------------------------------------------------

export async function fetchPayrollRunsForMonth(
  monthKey: string
): Promise<PayrollRun[]> {
  const { start, end } = monthRange(monthKey);
  return fetchPayrollRunsForRange(start, end);
}

/** Used by the salary-due bell/badge, which looks back further than one
 * displayed month (a missed weekly cutoff from last month is still due). */
export async function fetchPayrollRunsForRange(
  start: string,
  end: string
): Promise<PayrollRun[]> {
  const { data, error } = await getSupabaseClient()
    .from("payroll_runs")
    .select("*")
    .gte("period_month", start)
    .lte("period_month", end);

  if (error) throw new Error(error.message);
  return (data ?? []) as PayrollRun[];
}

export type PayrollRunInput = {
  staff_id: string;
  period_month: string;
  gross_pay: number;
  incentives_total: number;
  deductions_total: number;
  net_pay: number;
  paid_by: string | null;
};

export async function markPayrollPaid(input: PayrollRunInput) {
  const { error } = await getSupabaseClient()
    .from("payroll_runs")
    .upsert(input, { onConflict: "staff_id,period_month" });
  if (error) throw new Error(error.message);
}

export async function unmarkPayrollPaid(staffId: string, periodKey: string) {
  const { error } = await getSupabaseClient()
    .from("payroll_runs")
    .delete()
    .eq("staff_id", staffId)
    .eq("period_month", periodKey);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------
// Salary computation — ties attendance to a staff member's pay setup.
// ---------------------------------------------------------------

export type StaffPayrollSummary = {
  staff: Staff;
  period: PayPeriod;
  expectedWorkingDays: number;
  daysElapsed: number;
  dailyRate: number;
  hoursWorked: number;
  statusCounts: Record<AttendanceStatus, number>;
  unmarkedDays: number;
  /** Total minutes late across every 'late' day in the period — purely
   * informational (see lateDeductionTotal for the money it costs). */
  lateMinutesTotal: number;
  /** Pay lost to lateness: each late day pays only the fraction of the
   * shift actually worked, so this is the gap between "late paid in full"
   * and what actually gets paid out — already netted out of basePay below,
   * shown separately so it's visible on the payslip. */
  lateDeductionTotal: number;
  basePay: number;
  bonusTotal: number;
  commissionTotal: number;
  deductionTotal: number;
  netPay: number;
  incentives: StaffIncentive[];
  paid: boolean;
  paidAt: string | null;
};

function hoursBetween(timeIn: string | null, timeOut: string | null): number {
  if (!timeIn || !timeOut) return 0;
  const [inH, inM] = timeIn.split(":").map(Number);
  const [outH, outM] = timeOut.split(":").map(Number);
  const minutes = outH * 60 + outM - (inH * 60 + inM);
  return minutes > 0 ? minutes / 60 : 0;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Computes one staff member's pay for a single cutoff period from their
 * attendance record, pay setup, and any incentive line items — the actual
 * tie between the Attendance and Payroll pages.
 *
 * Monthly-salary staff: the daily rate is the month's basic pay split across
 * the days they're expected to work THE WHOLE MONTH (schedule minus
 * days_off) — using the full month rather than just this period is what
 * makes a weekly or semi-monthly cutoff a proportional slice of the same
 * monthly salary, rather than a fresh full salary every cutoff. Each day
 * within the period then earns a fraction of that daily rate:
 *   - present: full day
 *   - late: full day minus the fraction of the shift missed (see below)
 *   - half_day: half
 *   - absent / on_leave / unmarked: nothing
 * Only days up to `asOfDate` are counted, so an in-progress period doesn't
 * get penalized for days that haven't happened yet.
 *
 * Lateness: a 'late' day compares its recorded time_in against the staff
 * member's scheduled work_start. The minutes late, as a fraction of their
 * full shift length (work_end − work_start), is the fraction of that day's
 * pay withheld — so a few minutes late costs almost nothing, while showing
 * up at the end of the shift pays out like an absence.
 *
 * Hourly staff: pay is the sum of hours actually clocked (time_in/time_out)
 * within the period, times their rate — no schedule or lateness formula
 * needed since they're already only paid for hours worked.
 */
export function computeStaffPayroll(
  staff: Staff,
  monthKey: string,
  period: PayPeriod,
  attendance: StaffAttendance[],
  incentives: StaffIncentive[],
  asOfDate: string = toDateKey(new Date())
): StaffPayrollSummary {
  const byDate = new Map(attendance.map((row) => [row.attendance_date, row]));

  const statusCounts: Record<AttendanceStatus, number> = {
    present: 0,
    late: 0,
    half_day: 0,
    on_leave: 0,
    absent: 0,
  };

  // Full-month working-day count, purely to derive the daily rate a
  // monthly salary is split across — independent of which days this
  // particular period actually covers.
  let expectedWorkingDaysInMonth = 0;
  if (staff.salary_type !== "hourly") {
    const { start: monthStart, end: monthEnd } = monthRange(monthKey);
    const [msy, msm, msd] = monthStart.split("-").map(Number);
    const [mey, mem, med] = monthEnd.split("-").map(Number);
    const monthCursor = new Date(msy, msm - 1, msd);
    const monthEndDate = new Date(mey, mem - 1, med);
    while (monthCursor <= monthEndDate) {
      if (!staff.days_off.includes(monthCursor.getDay())) {
        expectedWorkingDaysInMonth += 1;
      }
      monthCursor.setDate(monthCursor.getDate() + 1);
    }
  }

  const dailyRate =
    expectedWorkingDaysInMonth > 0
      ? staff.base_salary / expectedWorkingDaysInMonth
      : 0;

  const shiftMinutes = Math.max(
    1,
    timeToMinutes(staff.work_end) - timeToMinutes(staff.work_start)
  );

  let expectedWorkingDays = 0;
  let daysElapsed = 0;
  let unmarkedDays = 0;
  let hoursWorked = 0;
  let elapsedFractionSum = 0;
  let lateMinutesTotal = 0;
  let lateDeductionFractionSum = 0; // in units of "days" of dailyRate

  const [sy, sm, sd] = period.start.split("-").map(Number);
  const cursor = new Date(sy, sm - 1, sd);
  const [ey, em, ed] = period.end.split("-").map(Number);
  const periodEnd = new Date(ey, em - 1, ed);

  while (cursor <= periodEnd) {
    const dateKey = toDateKey(cursor);
    const isWorkingDay = !staff.days_off.includes(cursor.getDay());
    const hasElapsed = dateKey <= asOfDate;

    if (isWorkingDay) expectedWorkingDays += 1;

    const row = byDate.get(dateKey);
    if (row) {
      hoursWorked += hoursBetween(row.time_in, row.time_out);
    }

    if (isWorkingDay && hasElapsed) {
      daysElapsed += 1;
      if (row) {
        statusCounts[row.status] += 1;

        if (row.status === "late" && row.time_in) {
          const lateMinutes = Math.max(
            0,
            timeToMinutes(row.time_in) - timeToMinutes(staff.work_start)
          );
          const lateFraction = Math.min(1, lateMinutes / shiftMinutes);
          lateMinutesTotal += lateMinutes;
          lateDeductionFractionSum += lateFraction;
          elapsedFractionSum += 1 - lateFraction;
        } else if (row.status === "present") {
          elapsedFractionSum += 1;
        } else if (row.status === "half_day") {
          elapsedFractionSum += 0.5;
        }
        // absent / on_leave contribute 0.
      } else {
        unmarkedDays += 1;
        // Unmarked = treated as absent for pay purposes.
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  const lateDeductionTotal = dailyRate * lateDeductionFractionSum;

  const basePay =
    staff.salary_type === "hourly"
      ? hoursWorked * staff.hourly_rate
      : dailyRate * elapsedFractionSum;

  const bonusTotal = incentives
    .filter((i) => i.kind === "bonus")
    .reduce((sum, i) => sum + i.amount, 0);
  const commissionTotal = incentives
    .filter((i) => i.kind === "commission")
    .reduce((sum, i) => sum + i.amount, 0);
  const deductionTotal = incentives
    .filter((i) => i.kind === "deduction")
    .reduce((sum, i) => sum + i.amount, 0);

  const netPay = Math.max(
    0,
    basePay + bonusTotal + commissionTotal - deductionTotal
  );

  return {
    staff,
    period,
    expectedWorkingDays,
    daysElapsed,
    dailyRate,
    hoursWorked,
    statusCounts,
    unmarkedDays,
    lateMinutesTotal,
    lateDeductionTotal,
    basePay,
    bonusTotal,
    commissionTotal,
    deductionTotal,
    netPay,
    incentives,
    paid: false,
    paidAt: null,
  };
}

// ---------------------------------------------------------------
// Salary-due detection — powers the bell notification, the Payroll-link
// badge, and the payday marks on the Attendance calendar.
// ---------------------------------------------------------------

export type DuePayroll = {
  staff: Staff;
  period: PayPeriod;
};

/**
 * Every cutoff, for every active staff member, whose pay date has already
 * passed and hasn't been marked paid yet — i.e. money someone is owed
 * right now.
 *
 * Bounded by `windowDays` (default 35, comfortably more than a month) so a
 * shop adopting Payroll partway through the year — with no payroll_runs
 * rows for anything before that — doesn't get every pre-adoption week
 * flagged "due" at once, burying the reminders that actually matter. The
 * Payroll page itself remains the full record, browsable by month; this is
 * only the "heads up, act now" signal for the bell/badge/calendar marks.
 *
 * Always scans the current and previous calendar month for period
 * candidates — one month back is enough for any of the three cutoff
 * shapes to have a period ending "recently" relative to `today`, even in
 * the first few days of a new month (e.g. a monthly cutoff that ended
 * yesterday, on the last day of last month) — then filters to `windowDays`
 * so older history still doesn't pile up.
 */
export function computeDuePayrolls(
  staffList: Staff[],
  runs: PayrollRun[],
  today: string,
  windowDays = 35
): DuePayroll[] {
  const due: DuePayroll[] = [];
  const currentMonthKey = toMonthKey(new Date(`${today}T00:00:00`));
  const windowStart = toDateKey(
    addDays(new Date(`${today}T00:00:00`), -windowDays)
  );

  for (const member of staffList) {
    if (!member.active) continue;
    const seenKeys = new Set<string>();

    for (const monthKey of [currentMonthKey, addMonths(currentMonthKey, -1)]) {
      for (const period of periodsForFrequency(member.pay_frequency, monthKey)) {
        if (seenKeys.has(period.key)) continue; // a week can span two months
        seenKeys.add(period.key);
        if (period.end > today) continue; // not payday yet
        if (period.end < windowStart) continue; // too old, don't nag forever

        const paid = runs.some(
          (r) => r.staff_id === member.id && r.period_month === period.key
        );
        if (!paid) due.push({ staff: member, period });
      }
    }
  }

  due.sort((a, b) => a.period.end.localeCompare(b.period.end));
  return due;
}
