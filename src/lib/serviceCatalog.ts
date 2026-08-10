// CRUD for the service/package catalogue that admins manage and that the
// public booking site reads from (tables: service_categories, services).
// Kept separate from lib/services.ts, which is a small static list used only
// by the walk-in POS/booking-drawer quick-pick UI.
import { getSupabaseClient } from "./supabase";
import type { Service, ServiceCategory } from "./types";

export type ServiceCategoryInput = {
  name: string;
  name_ar: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
};

export type ServiceInput = {
  category_id: string | null;
  name: string;
  name_ar: string | null;
  description: string | null;
  duration_minutes: number;
  price: number;
  image_url: string | null;
  is_package: boolean;
  active: boolean;
  sort_order: number;
};

export async function fetchServiceCategories(): Promise<ServiceCategory[]> {
  const { data, error } = await getSupabaseClient()
    .from("service_categories")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as ServiceCategory[];
}

export async function createServiceCategory(input: ServiceCategoryInput) {
  const { error } = await getSupabaseClient()
    .from("service_categories")
    .insert(input);
  if (error) throw new Error(error.message);
}

export async function updateServiceCategory(
  id: string,
  input: Partial<ServiceCategoryInput>
) {
  const { error } = await getSupabaseClient()
    .from("service_categories")
    .update(input)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteServiceCategory(id: string) {
  const { error } = await getSupabaseClient()
    .from("service_categories")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchCatalogServices(): Promise<Service[]> {
  const { data, error } = await getSupabaseClient()
    .from("services")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
}

export async function createCatalogService(input: ServiceInput) {
  const { error } = await getSupabaseClient().from("services").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateCatalogService(
  id: string,
  input: Partial<ServiceInput>
) {
  const { error } = await getSupabaseClient()
    .from("services")
    .update(input)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCatalogService(id: string) {
  const { error } = await getSupabaseClient()
    .from("services")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
