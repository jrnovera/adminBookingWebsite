import { getSupabaseClient } from "./supabase";
import type { Staff, StaffTimeOff } from "./types";

export const weekdayLabels = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export async function fetchStaff(): Promise<Staff[]> {
  const { data, error } = await getSupabaseClient()
    .from("staff")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Staff[];
}

export async function fetchTimeOff(): Promise<StaffTimeOff[]> {
  const { data, error } = await getSupabaseClient()
    .from("staff_time_off")
    .select("*")
    .order("start_date");

  if (error) throw new Error(error.message);
  return (data ?? []) as StaffTimeOff[];
}

export type StaffInput = {
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  work_start: string;
  work_end: string;
  days_off: number[];
};

export async function createStaff(input: StaffInput) {
  const { error } = await getSupabaseClient().from("staff").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateStaff(id: string, input: Partial<StaffInput>) {
  const { error } = await getSupabaseClient()
    .from("staff")
    .update(input)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteStaff(id: string) {
  const { error } = await getSupabaseClient()
    .from("staff")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addTimeOff(input: {
  staff_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}) {
  const { error } = await getSupabaseClient()
    .from("staff_time_off")
    .insert(input);
  if (error) throw new Error(error.message);
}

export async function deleteTimeOff(id: string) {
  const { error } = await getSupabaseClient()
    .from("staff_time_off")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function isStaffOffOn(
  staff: Staff,
  dateKey: string,
  timeOff: StaffTimeOff[]
) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  if (staff.days_off.includes(weekday)) return true;

  return timeOff.some(
    (entry) =>
      entry.staff_id === staff.id &&
      dateKey >= entry.start_date &&
      dateKey <= entry.end_date
  );
}
