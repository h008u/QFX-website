"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { callBot } from "@/lib/admin/bot-api";
import { audit, requireRole } from "@/lib/admin/session";

export async function runTickAction(): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  if (ctx.demo) return { ok: false, message: "يحتاج خدمة البوت (غير متاح في وضع المعاينة)" };
  const r = await callBot<{ result: Record<string, unknown> }>("/jobs/tick", "POST", {}, 120_000);
  await audit(ctx, "tick.run", "manual");
  revalidatePath("/admin", "layout");
  if (!r.ok) return { ok: false, message: r.error ?? "فشل" };
  const res = r.data?.result ?? {};
  return { ok: true, message: "skipped" in res ? `تخطّى: ${String(res.skipped)}` : `تم تشغيل: ${Object.keys(res).join("، ") || "لا شيء مستحق"}` };
}
