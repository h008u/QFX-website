"use server";

import { calcPips, CLOSED_STATUSES, detectAssetClass, normalizeSymbol, validateSignalInput, type Direction, type SignalStatus } from "@qfx/shared";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { callBot } from "@/lib/admin/bot-api";
import { audit, requireRole } from "@/lib/admin/session";

const num = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? Number(s) : null;
};

const refresh = () => ["/admin/signals", "/admin/flow", "/signals", "/"].forEach((p) => revalidatePath(p));

export async function createSignalAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const input = {
    symbol: normalizeSymbol(String(f.get("symbol") ?? "")),
    direction: String(f.get("direction")) as Direction,
    entry_price: num(f.get("entry_price")) ?? NaN,
    stop_loss: num(f.get("stop_loss")) ?? NaN,
    take_profit_1: num(f.get("take_profit_1")) ?? NaN,
    take_profit_2: num(f.get("take_profit_2")),
    take_profit_3: num(f.get("take_profit_3")),
    notes: String(f.get("notes") ?? "").trim() || null,
  };
  const errors = validateSignalInput(input);
  if (errors.length) return { ok: false, message: errors.join("، ") };

  if (ctx.demo) {
    await ctx.db.from("signals").insert({ ...input, asset_class: detectAssetClass(input.symbol), status: "open", source: "admin", opened_at: new Date().toISOString() });
  } else {
    const r = await callBot("/signals", "POST", input);
    if (!r.ok) return { ok: false, message: r.error ?? "فشل" };
  }
  await audit(ctx, "signal.create", `${input.direction} ${input.symbol}`);
  refresh();
  return { ok: true, message: ctx.demo ? "أُضيفت التوصية (محاكاة)" : "تم النشر في تيليجرام والموقع ✅" };
}

export async function updateSignalAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const id = String(f.get("id") ?? "");
  const status = String(f.get("status")) as Exclude<SignalStatus, "pending">;
  const exit = num(f.get("exit_price"));
  const notes = String(f.get("notes") ?? "").trim() || null;
  if (!id) return { ok: false, message: "اختر توصية" };

  if (ctx.demo) {
    const { data: s } = await ctx.db.from("signals").select("*").eq("id", id).single();
    const target = exit ?? (status === "tp_hit" ? s.take_profit_1 : status === "sl_hit" ? s.stop_loss : null);
    await ctx.db
      .from("signals")
      .update({
        status,
        result_pips: target ? calcPips(s.symbol, s.direction, Number(s.entry_price), Number(target)) : null,
        closed_at: CLOSED_STATUSES.includes(status) ? new Date().toISOString() : null,
      })
      .eq("id", id);
  } else {
    const r = await callBot(`/signals/${id}`, "PATCH", { status, exit_price: exit, notes });
    if (!r.ok) return { ok: false, message: r.error ?? "فشل" };
  }
  await audit(ctx, "signal.update", `${id.slice(0, 8)} → ${status}`);
  refresh();
  return { ok: true, message: "تم التحديث والرد على رسالة التوصية ✅" };
}
