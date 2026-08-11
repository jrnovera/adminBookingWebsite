import { getSupabaseClient } from "./supabase";

/**
 * Whether the signed-in user holds the superadmin role.
 *
 * The answer comes from public.user_roles (see supabase/017_superadmin_role.sql),
 * not from a list in this file — the same table backs the RLS policies that
 * actually enforce deletion, so the UI and the database can't disagree about
 * who is a superadmin.
 *
 * Fails closed: any error, or no row, means "not a superadmin". Hiding a
 * button the user could have pressed is a much cheaper mistake than showing
 * one that will fail at the database.
 */
export async function fetchIsSuperAdmin(userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return data?.role === "superadmin";
}
