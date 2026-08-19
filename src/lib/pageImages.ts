import { getSupabaseClient } from "./supabase";

/** Every hero/banner slot on the public site an admin can override. */
export const PAGE_IMAGE_KEYS = [
  "home_hero",
  "about_hero",
  "services_hero",
  "team_hero",
  "reviews_hero",
  "blog_hero",
  "promos_hero",
  "packages_hero",
] as const;

export type PageImageKey = (typeof PAGE_IMAGE_KEYS)[number];

export async function fetchPageImages(): Promise<
  Partial<Record<PageImageKey, string>>
> {
  const { data, error } = await getSupabaseClient()
    .from("page_images")
    .select("key, url");

  if (error) throw new Error(error.message);

  const map: Partial<Record<PageImageKey, string>> = {};
  for (const row of data ?? []) {
    map[row.key as PageImageKey] = row.url as string;
  }
  return map;
}

/** Pass `url: null` to clear an override and fall back to the site's default photo. */
export async function savePageImage(key: PageImageKey, url: string | null) {
  const supabase = getSupabaseClient();

  if (url) {
    const { error } = await supabase
      .from("page_images")
      .upsert({ key, url, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("page_images").delete().eq("key", key);
  if (error) throw new Error(error.message);
}
