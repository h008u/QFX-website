"use server";

import { SETTINGS_KEYS, type BotSettings, type SettingsKey } from "@qfx/shared";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { callBot } from "@/lib/admin/bot-api";
import { audit, requireRole } from "@/lib/admin/session";
import { cleanSection } from "@/lib/admin/validate-settings";

/** يحفظ قسماً من إعدادات البوت (المحرر والمدير) */
export async function saveSettingsAction<K extends SettingsKey>(key: K, value: BotSettings[K]): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  if (!SETTINGS_KEYS.includes(key)) return { ok: false, message: "قسم غير معروف" };
  let clean: BotSettings[K];
  try {
    clean = cleanSection(key, value);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "قيمة غير صالحة" };
  }
  const { data: existing } = await ctx.db.from("settings").select("key").eq("key", key).maybeSingle();
  const { error } = existing
    ? await ctx.db.from("settings").update({ value: clean, updated_by: ctx.demo ? null : ctx.user.id }).eq("key", key)
    : await ctx.db.from("settings").insert({ key, value: clean, updated_by: ctx.demo ? null : ctx.user.id });
  if (error) return { ok: false, message: error.message };
  await audit(ctx, "settings.save", key);
  if (!ctx.demo) await callBot("/settings/invalidate", "POST", {}, 8000);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "تم الحفظ ✅ — البوت يطبّقها خلال دقيقة" };
}

export interface DestinationCheck {
  ok: boolean;
  title?: string;
  type?: string;
  problems: string[];
}

/** يتأكد أن البوت أدمن بالقناة أو عضو بالمجموعة */
export async function checkDestinationAction(chat_id: string, thread_id: number | null): Promise<DestinationCheck> {
  const ctx = await requireRole("editor");
  if (ctx.demo) return { ok: true, title: chat_id, type: "channel", problems: [] };
  const r = await callBot<DestinationCheck>("/destinations/check", "POST", { chat_id, thread_id }, 30_000);
  return r.ok && r.data ? r.data : { ok: false, problems: [r.error ?? "فشل الفحص"] };
}

export interface SourceCheck {
  id: string;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
  ms: number;
}

/** يفحص كل مصادر الأخبار من السيرفر */
export async function checkSourcesAction(): Promise<{ ok: boolean; message?: string; sources: SourceCheck[] }> {
  const ctx = await requireRole("editor");
  if (ctx.demo) return { ok: false, message: "الفحص يحتاج خدمة البوت (غير متاح في وضع المعاينة)", sources: [] };
  const r = await callBot<{ sources: SourceCheck[] }>("/news/sources", "GET", undefined, 60_000);
  return r.ok ? { ok: true, sources: r.data?.sources ?? [] } : { ok: false, message: r.error, sources: [] };
}

/** تجربة فورية لقسم (تحية، أجندة، ملخص...) */
export async function runTestAction(what: string): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  if (!/^(morning|open|close|agenda|weekly|news|calendar|alerts|due)$/.test(what)) return { ok: false, message: "قسم غير معروف" };
  if (ctx.demo) return { ok: false, message: "التجربة تحتاج خدمة البوت (غير متاحة في وضع المعاينة)" };
  const r = await callBot<{ result: unknown }>(`/test/${what}`, "POST", {}, 90_000);
  await audit(ctx, "test.run", what);
  revalidatePath("/admin", "layout");
  return r.ok ? { ok: true, message: `تم ✅ ${JSON.stringify(r.data?.result ?? {}).slice(0, 160)}` } : { ok: false, message: r.error ?? "فشل" };
}

/** إيقاف/استئناف النشر التلقائي */
export async function setPausedAction(paused: boolean, current: BotSettings["general"]): Promise<ActionResult> {
  return saveSettingsAction("general", { ...current, paused });
}
