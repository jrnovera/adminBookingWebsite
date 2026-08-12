import { getSupabaseClient } from "./supabase";
import type { PayFrequency, SalaryType, Staff, StaffTimeOff } from "./types";

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

/** staff_id -> set of category_ids that staff member is qualified to work
 * in (Hair, Nails, Massage, …). A staff member absent from this map (or
 * mapped to an empty set) has no explicit expertise on file, which the
 * booking site treats as "bookable for anything" — see
 * supabase/021_staff_categories.sql. */
export async function fetchStaffCategoryMap(): Promise<
  Map<string, Set<string>>
> {
  const { data, error } = await getSupabaseClient()
    .from("staff_categories")
    .select("staff_id, category_id");

  if (error) throw new Error(error.message);

  const map = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const staffId = row.staff_id as string;
    const set = map.get(staffId) ?? new Set<string>();
    set.add(row.category_id as string);
    map.set(staffId, set);
  }
  return map;
}

/** Replaces a staff member's full set of worked categories in one go —
 * simpler and less error-prone than diffing add/remove for a checklist UI. */
export async function setStaffCategories(
  staffId: string,
  categoryIds: string[]
) {
  const client = getSupabaseClient();
  const { error: deleteError } = await client
    .from("staff_categories")
    .delete()
    .eq("staff_id", staffId);
  if (deleteError) throw new Error(deleteError.message);

  if (categoryIds.length === 0) return;

  const { error: insertError } = await client
    .from("staff_categories")
    .insert(
      categoryIds.map((category_id) => ({ staff_id: staffId, category_id }))
    );
  if (insertError) throw new Error(insertError.message);
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
  avatar_url?: string | null;
  salary_type?: SalaryType;
  base_salary?: number;
  hourly_rate?: number;
  pay_frequency?: PayFrequency;
};

export async function createStaff(input: StaffInput): Promise<string> {
  const { data, error } = await getSupabaseClient()
    .from("staff")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
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
