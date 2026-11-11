"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { audit, requireRole } from "@/lib/admin/session";

const STATUSES = ["new", "contacted", "registered", "verified", "funded", "rejected"];

export async function updateLeadAction(id: string, patch: { status?: string; notes?: string }): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  if (patch.status && !STATUSES.includes(patch.status)) return { ok: false, message: "حالة غير صالحة" };
  const clean: Record<string, unknown> = {};
  if (patch.status) clean.status = patch.status;
  if (patch.notes !== undefined) clean.notes = patch.notes.trim().slice(0, 2000) || null;
  const { error } = await ctx.db.from("leads").update(clean).eq("id", id);
  if (error) return { ok: false, message: error.message };
  await audit(ctx, "lead.update", id.slice(0, 8), clean);
  revalidatePath("/admin/crm");
  return { ok: true, message: "تم الحفظ" };
}
