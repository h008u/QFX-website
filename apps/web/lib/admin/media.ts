import "server-only";
import type { AdminContext } from "./session";

export interface MediaItem {
  name: string;
  url: string;
  size: number | null;
  created_at: string | null;
}

const DEMO_MEDIA = ["/demo/1.svg", "/demo/2.svg", "/demo/3.svg"];

/** ملفات مكتبة الصور (Supabase Storage — bucket media) */
export async function listMedia(ctx: AdminContext): Promise<MediaItem[]> {
  if (ctx.demo) return DEMO_MEDIA.map((url, i) => ({ name: `demo-${i + 1}.jpg`, url, size: null, created_at: null }));
  const { data, error } = await ctx.db.storage.from("media").list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
  if (error) {
    console.error("[media]", error.message);
    return [];
  }
  return (data ?? [])
    .filter((f) => f.name && !f.name.startsWith("."))
    .map((f) => ({
      name: f.name,
      url: ctx.db.storage.from("media").getPublicUrl(f.name).data.publicUrl,
      size: (f.metadata as { size?: number } | null)?.size ?? null,
      created_at: f.created_at ?? null,
    }));
}
