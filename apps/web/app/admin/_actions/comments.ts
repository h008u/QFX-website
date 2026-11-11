"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { audit, requireRole } from "@/lib/admin/session";

export async function deleteCommentAction(id: string, preview: string): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const { data, error } = await ctx.db.from("comments").delete().eq("id", id).select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "التعليق غير موجود" };
  await audit(ctx, "comment.delete", preview.slice(0, 80));
  revalidatePath("/admin/comments");
  return { ok: true, message: "حُذف التعليق" };
}
