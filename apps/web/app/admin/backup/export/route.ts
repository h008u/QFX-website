import { NextResponse } from "next/server";
import { audit, getAdminContext } from "@/lib/admin/session";

/** نسخة احتياطية JSON: الإعدادات والقوالب وتنبيهات الأسعار والتوصيات والعملاء (بدون أسرار — المفاتيح في متغيرات البيئة) */
export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx || ctx.role !== "admin") return new NextResponse("Forbidden", { status: 403 });
  const [settings, alerts, signals, leads] = await Promise.all([
    ctx.db.from("settings").select("key, value").not("key", "like", "state.%"),
    ctx.db.from("price_alerts").select("symbol, direction, price, note, repeat, cooldown_min, active"),
    ctx.db.from("signals").select("*").order("created_at"),
    ctx.db.from("leads").select("*").order("created_at"),
  ]);
  const body = {
    app: "qfx-admin",
    version: 1,
    exported_at: new Date().toISOString(),
    settings: Object.fromEntries((settings.data ?? []).map((r) => [r.key, r.value])),
    price_alerts: alerts.data ?? [],
    signals: signals.data ?? [],
    leads: leads.data ?? [],
  };
  const at = new Date().toISOString();
  const { data: ex } = await ctx.db.from("settings").select("key").eq("key", "state.backup").maybeSingle();
  if (ex) await ctx.db.from("settings").update({ value: { at } }).eq("key", "state.backup");
  else await ctx.db.from("settings").insert({ key: "state.backup", value: { at } });
  await audit(ctx, "backup.export", `${(signals.data ?? []).length} توصية، ${(leads.data ?? []).length} عميل`);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="qfx-backup-${at.slice(0, 10)}.json"` },
  });
}
