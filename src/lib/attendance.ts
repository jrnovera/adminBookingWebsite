import { getSupabaseClient } from "./supabase";
import type { AttendanceStatus, StaffAttendance } from "./types";

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  half_day: "Half day",
  on_leave: "On leave",
  absent: "Absent",
};

/** Fraction of a full day's pay this status earns — see lib/payroll.ts. */
export const attendanceStatusPayFraction: Record<AttendanceStatus, number> = {
  present: 1,
  late: 1,
  half_day: 0.5,
  on_leave: 0,
  absent: 0,
};

export function monthRange(monthKey: string): { start: string; end: string } {
  // monthKey is "2026-08" — expand to the first and last calendar day.
  const [year, month] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export async function fetchAttendanceForMonth(
  monthKey: string
): Promise<StaffAttendance[]> {
  const { start, end } = monthRange(monthKey);
  return fetchAttendanceForRange(start, end);
}

/** Weekly pay periods can spill a few days past the displayed month's
 * boundary (see lib/format.ts weeklyPeriodsInMonth), so Payroll pads its
 * fetch range rather than reusing fetchAttendanceForMonth's exact bounds. */
export async function fetchAttendanceForRange(
  start: string,
  end: string
): Promise<StaffAttendance[]> {
  const { data, error } = await getSupabaseClient()
    .from("staff_attendance")
    .select("*")
    .gte("attendance_date", start)
    .lte("attendance_date", end)
    .order("attendance_date");

  if (error) throw new Error(error.message);
  return (data ?? []) as StaffAttendance[];
}

export async function fetchAttendanceForDate(
  dateKey: string
): Promise<StaffAttendance[]> {
  const { data, error } = await getSupabaseClient()
    .from("staff_attendance")
    .select("*")
    .eq("attendance_date", dateKey);

  if (error) throw new Error(error.message);
  return (data ?? []) as StaffAttendance[];
}

export type AttendanceInput = {
  staff_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  time_in?: string | null;
  time_out?: string | null;
  notes?: string | null;
};

/** One row per staff member per day — upsert so re-marking a day just
 * overwrites what was there, instead of piling up duplicate rows. */
export async function markAttendance(input: AttendanceInput) {
  const { error } = await getSupabaseClient()
    .from("staff_attendance")
    .upsert(input, { onConflict: "staff_id,attendance_date" });
  if (error) throw new Error(error.message);
}

export async function deleteAttendance(id: string) {
  const { error } = await getSupabaseClient()
    .from("staff_attendance")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
