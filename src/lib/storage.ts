import { getSupabaseClient } from "./supabase";

export async function uploadImage(
  bucket: "staff-photos" | "shop-assets",
  file: File
) {
  const supabase = getSupabaseClient();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
