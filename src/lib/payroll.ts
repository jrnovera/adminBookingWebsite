import { getSupabaseClient } from "./supabase";
import { toDateKey } from "./format";
import { attendanceStatusPayFraction, monthRange } from "./attendance";
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

export async function fetchIncentivesForMonth(
  monthKey: string
): Promise<StaffIncentive[]> {
  const { data, error } = await getSupabaseClient()
    .from("staff_incentives")
    .select("*")
    .eq("period_month", `${monthKey}-01`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as StaffIncentive[];
}

export type IncentiveInput = {
  staff_id: string;
  period_month: string; // "2026-08-01"
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
// Payroll runs (marking a month paid)
// ---------------------------------------------------------------

export async function fetchPayrollRunsForMonth(
  monthKey: string
): Promise<PayrollRun[]> {
  const { data, error } = await getSupabaseClient()
    .from("payroll_runs")
    .select("*")
    .eq("period_month", `${monthKey}-01`);

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

export async function unmarkPayrollPaid(staffId: string, monthKey: string) {
  const { error } = await getSupabaseClient()
    .from("payroll_runs")
    .delete()
    .eq("staff_id", staffId)
    .eq("period_month", `${monthKey}-01`);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------
// Salary computation — ties attendance to a staff member's pay setup.
// ---------------------------------------------------------------

export type StaffPayrollSummary = {
  staff: Staff;
  expectedWorkingDays: number;
  daysElapsed: number;
  dailyRate: number;
  hoursWorked: number;
  statusCounts: Record<AttendanceStatus, number>;
  unmarkedDays: number;
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

/**
 * Computes one staff member's pay for a month from their attendance record,
 * pay setup, and any incentive line items — the actual tie between the
 * Attendance and Payroll pages.
 *
 * Monthly staff: the month's basic pay is split evenly across the days they
 * were actually expected to work (their schedule minus days_off), so a
 * daily rate falls out of their own salary rather than a fixed assumption.
 * Each day then earns a fraction of that daily rate based on status —
 * present/late pay in full, half-day pays half, absent/on-leave/unmarked
 * pay nothing. Only days up to `asOfDate` are counted, so an in-progress
 * month doesn't get penalized for days that haven't happened yet.
 *
 * Hourly staff: pay is the sum of hours actually clocked (time_in/time_out)
 * across the month, times their rate — no schedule assumption needed.
 */
export function computeStaffPayroll(
  staff: Staff,
  monthKey: string,
  attendance: StaffAttendance[],
  incentives: StaffIncentive[],
  asOfDate: string = toDateKey(new Date())
): StaffPayrollSummary {
  const { start, end } = monthRange(monthKey);
  const cutoff = asOfDate < end ? (asOfDate < start ? start : asOfDate) : end;

  const byDate = new Map(attendance.map((row) => [row.attendance_date, row]));

  const statusCounts: Record<AttendanceStatus, number> = {
    present: 0,
    late: 0,
    half_day: 0,
    on_leave: 0,
    absent: 0,
  };

  let expectedWorkingDays = 0;
  let daysElapsed = 0;
  let unmarkedDays = 0;
  let hoursWorked = 0;
  let elapsedFractionSum = 0; // in units of "days paid" for monthly staff

  const [sy, sm, sd] = start.split("-").map(Number);
  const cursor = new Date(sy, sm - 1, sd);
  const [ey, em, ed] = end.split("-").map(Number);
  const monthEnd = new Date(ey, em - 1, ed);

  while (cursor <= monthEnd) {
    const dateKey = toDateKey(cursor);
    const isWorkingDay = !staff.days_off.includes(cursor.getDay());
    const hasElapsed = dateKey <= cutoff;

    if (isWorkingDay) expectedWorkingDays += 1;

    const row = byDate.get(dateKey);
    if (row) {
      hoursWorked += hoursBetween(row.time_in, row.time_out);
    }

    if (isWorkingDay && hasElapsed) {
      daysElapsed += 1;
      if (row) {
        statusCounts[row.status] += 1;
        elapsedFractionSum += attendanceStatusPayFraction[row.status];
      } else {
        unmarkedDays += 1;
        // Unmarked = treated as absent for pay purposes.
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  const dailyRate =
    expectedWorkingDays > 0 ? staff.base_salary / expectedWorkingDays : 0;

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
    expectedWorkingDays,
    daysElapsed,
    dailyRate,
    hoursWorked,
    statusCounts,
    unmarkedDays,
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
