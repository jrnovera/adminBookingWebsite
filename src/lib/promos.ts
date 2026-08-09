import { getSupabaseClient } from "./supabase";
import type { Promo } from "./types";

export type PromoInput = {
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  starts_on: string | null;
  ends_on: string | null;
  usage_limit: number | null;
  active: boolean;
};

export async function fetchPromos(): Promise<Promo[]> {
  const { data, error } = await getSupabaseClient()
    .from("promos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Promo[];
}

export async function createPromo(input: PromoInput) {
  const { error } = await getSupabaseClient().from("promos").insert(input);
  if (error) throw new Error(error.message);
}

export async function updatePromo(id: string, input: Partial<PromoInput>) {
  const { error } = await getSupabaseClient()
    .from("promos")
    .update(input)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePromo(id: string) {
  const { error } = await getSupabaseClient().from("promos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function promoState(promo: Promo, todayKey: string) {
  if (!promo.active) return "paused" as const;
  if (promo.starts_on && todayKey < promo.starts_on) return "scheduled" as const;
  if (promo.ends_on && todayKey > promo.ends_on) return "expired" as const;
  if (promo.usage_limit !== null && promo.times_used >= promo.usage_limit) {
    return "used up" as const;
  }
  return "live" as const;
}

export const promoStateStyles: Record<string, string> = {
  live: "bg-emerald-100 text-emerald-800",
  scheduled: "bg-sky-100 text-sky-800",
  expired: "bg-foreground/10 text-foreground/60",
  paused: "bg-foreground/10 text-foreground/60",
  "used up": "bg-amber-100 text-amber-800",
};
