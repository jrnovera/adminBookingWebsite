import { getSupabaseClient } from "./supabase";
import type { ShopSettings } from "./types";

export async function fetchSettings(): Promise<ShopSettings | null> {
  const { data, error } = await getSupabaseClient()
    .from("shop_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ShopSettings) ?? null;
}

export async function saveSettings(input: Partial<ShopSettings>) {
  const { error } = await getSupabaseClient()
    .from("shop_settings")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) throw new Error(error.message);
}

export async function updateEmail(email: string) {
  const { error } = await getSupabaseClient().auth.updateUser({ email });
  if (error) throw new Error(error.message);
}

export async function updatePassword(password: string) {
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
