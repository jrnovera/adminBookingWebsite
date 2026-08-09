import { getSupabaseClient } from "./supabase";
import type { Product } from "./types";

export type ProductInput = {
  name: string;
  sku: string | null;
  category: string;
  price: number;
  cost: number;
  stock: number;
  low_stock_at: number;
  active: boolean;
};

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await getSupabaseClient()
    .from("products")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function createProduct(input: ProductInput) {
  const { error } = await getSupabaseClient().from("products").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const { error } = await getSupabaseClient()
    .from("products")
    .update(input)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProduct(id: string) {
  const { error } = await getSupabaseClient()
    .from("products")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export type StockLevel = "out" | "low" | "in";

export function stockLevel(product: Product): StockLevel {
  if (product.stock <= 0) return "out";
  if (product.stock <= product.low_stock_at) return "low";
  return "in";
}

export const stockLabels: Record<StockLevel, string> = {
  out: "Out of Stock",
  low: "Low Stock",
  in: "In Stock",
};

export const stockStyles: Record<StockLevel, string> = {
  out: "bg-rose-100 text-rose-700",
  low: "bg-amber-100 text-amber-800",
  in: "bg-emerald-100 text-emerald-800",
};
