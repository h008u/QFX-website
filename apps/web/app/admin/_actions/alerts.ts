"use server";

import { normalizeSymbol } from "@qfx/shared";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { audit, requireRole } from "@/lib/admin/session";

export async function createAlertAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const symbol = normalizeSymbol(String(f.get("symbol") ?? ""));
  const direction = String(f.get("direction"));
  const price = Number(f.get("price"));
  const cooldown = Number(f.get("cooldown_min") || 60);
  if (!/^[A-Z0-9]{3,12}$/.test(symbol)) return { ok: false, message: "رمز غير صالح" };
  if (direction !== "above" && direction !== "below") return { ok: false, message: "اختر الاتجاه" };
  if (!(price > 0)) return { ok: false, message: "السعر غير صالح" };
  const { error } = await ctx.db.from("price_alerts").insert({
    symbol,
    direction,
    price,
    note: String(f.get("note") ?? "").trim() || null,
    repeat: f.get("repeat") === "on",
    cooldown_min: Math.min(10080, Math.max(5, cooldown)),
    created_by: ctx.demo ? null : ctx.user.id,
  });
  if (error) return { ok: false, message: error.message };
  await audit(ctx, "alert.create", `${symbol} ${direction} ${price}`);
  revalidatePath("/admin/alerts");
  return { ok: true, message: "أُضيف التنبيه — البوت يفحص السعر كل بضع دقائق" };
}

export async function toggleAlertAction(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const { error } = await ctx.db.from("price_alerts").update({ active, ...(active ? { triggered_at: null } : {}) }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  await audit(ctx, active ? "alert.enable" : "alert.disable", id.slice(0, 8));
  revalidatePath("/admin/alerts");
  return { ok: true, message: active ? "تم التفعيل" : "تم الإيقاف" };
}

export async function deleteAlertAction(id: string): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const { error } = await ctx.db.from("price_alerts").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  await audit(ctx, "alert.delete", id.slice(0, 8));
  revalidatePath("/admin/alerts");
  return { ok: true, message: "تم الحذف" };
}
