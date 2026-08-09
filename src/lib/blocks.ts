import { getSupabaseClient } from "./supabase";
import type { StaffBlock } from "./types";

export async function fetchBlocks(): Promise<StaffBlock[]> {
  const { data, error } = await getSupabaseClient()
    .from("staff_blocks")
    .select("*")
    .order("block_date");

  if (error) throw new Error(error.message);
  return (data ?? []) as StaffBlock[];
}

export async function createBlock(input: {
  staff_id: string;
  block_date: string;
  start_minutes: number;
  end_minutes: number;
  reason: string | null;
}) {
  const { error } = await getSupabaseClient().from("staff_blocks").insert(input);
  if (error) throw new Error(error.message);
}

export async function deleteBlock(id: string) {
  const { error } = await getSupabaseClient()
    .from("staff_blocks")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
