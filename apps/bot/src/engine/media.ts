import { db } from "../supabase";

/** يرفع صورة لمكتبة Supabase Storage ويرجع رابطها العام (يُستخدم كـ photo_url للمنشور) */
export async function uploadImage(path: string, png: Buffer): Promise<string | null> {
  const { error } = await db().storage.from("media").upload(path, png, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
  if (error) {
    console.error("[media] upload", error.message);
    return null;
  }
  return db().storage.from("media").getPublicUrl(path).data.publicUrl;
}
