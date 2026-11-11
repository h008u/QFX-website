"use server";

import { SETTINGS_KEYS, type SettingsKey } from "@qfx/shared";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { audit, requireRole } from "@/lib/admin/session";
import { cleanSection } from "@/lib/admin/validate-settings";

/** استرجاع نسخة: الإعدادات (كل الأقسام بعد التحقق) + تنبيهات الأسعار */
export async function restoreBackupAction(json: string): Promise<ActionResult> {
  const ctx = await requireRole("admin");
  let data: { app?: string; settings?: Record<string, unknown>; price_alerts?: Record<string, unknown>[] };
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, message: "الملف ليس JSON صالحاً" };
  }
  if (data.app !== "qfx-admin") return { ok: false, message: "هذا ليس ملف نسخة من لوحة QFX" };
  const restored: string[] = [];
  for (const [key, value] of Object.entries(data.settings ?? {})) {
    if (!SETTINGS_KEYS.includes(key as SettingsKey)) continue;
    try {
      const clean = cleanSection(key as SettingsKey, value);
      const { data: ex } = await ctx.db.from("settings").select("key").eq("key", key).maybeSingle();
      const { error } = ex ? await ctx.db.from("settings").update({ value: clean }).eq("key", key) : await ctx.db.from("settings").insert({ key, value: clean });
      if (!error) restored.push(key);
    } catch (e) {
      return { ok: false, message: `القسم ${key}: ${e instanceof Error ? e.message : "غير صالح"}` };
    }
  }
  let alerts = 0;
  for (const a of (data.price_alerts ?? []).slice(0, 100)) {
    const row = { symbol: a.symbol, direction: a.direction, price: a.price, note: a.note ?? null, repeat: Boolean(a.repeat), cooldown_min: a.cooldown_min ?? 60, active: Boolean(a.active) };
    const { error } = await ctx.db.from("price_alerts").insert(row);
    if (!error) alerts++;
  }
  await audit(ctx, "backup.restore", `${restored.length} أقسام، ${alerts} تنبيه`);
  revalidatePath("/admin", "layout");
  return { ok: true, message: `تم استرجاع ${restored.length} قسم إعدادات و${alerts} تنبيه سعر ✅` };
}
