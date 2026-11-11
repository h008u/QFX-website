"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { audit, requireRole } from "@/lib/admin/session";

export async function deleteMediaAction(name: string): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  if (ctx.demo) return { ok: false, message: "غير متاح في وضع المعاينة" };
  if (!/^[\w.-]{1,200}$/.test(name)) return { ok: false, message: "اسم غير صالح" };
  const { error } = await ctx.db.storage.from("media").remove([name]);
  if (error) return { ok: false, message: error.message };
  await audit(ctx, "media.delete", name);
  revalidatePath("/admin/media");
  return { ok: true, message: "تم الحذف" };
}

export async function logUploadAction(names: string[]): Promise<void> {
  const ctx = await requireRole("editor");
  await audit(ctx, "media.upload", names.join("، ").slice(0, 200));
  revalidatePath("/admin/media");
}
