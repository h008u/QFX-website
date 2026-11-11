"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { checkBasicAuth } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/supabase/server";

export interface ActionState {
  ok: boolean;
  message: string;
}

/** معرّفات Server Actions يمكن استدعاؤها من أي مسار، لذا نتحقق من الهوية داخل كل إجراء */
async function assertAdmin() {
  const h = await headers();
  if (!checkBasicAuth(h.get("authorization"))) throw new Error("unauthorized");
}

async function callBot(path: string, method: "POST" | "PATCH", body: unknown): Promise<ActionState> {
  const url = process.env.BOT_API_URL?.replace(/\/$/, "");
  const key = process.env.BOT_API_KEY;
  if (!url || !key) return { ok: false, message: "اضبط BOT_API_URL و BOT_API_KEY في إعدادات الموقع" };
  try {
    const res = await fetch(`${url}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      cache: "no-store",
      // الخدمة المجانية قد تكون نائمة وتحتاج وقتاً للاستيقاظ
      signal: AbortSignal.timeout(60_000),
    });
    const json = (await res.json().catch(() => ({}))) as { errors?: string[]; error?: string };
    if (!res.ok) return { ok: false, message: json.errors?.join("، ") ?? json.error ?? `خطأ ${res.status}` };
    revalidatePath("/signals");
    revalidatePath("/feed");
    revalidatePath("/");
    return { ok: true, message: "تم الحفظ والنشر في تيليجرام والموقع ✅" };
  } catch (err) {
    console.error("[admin] bot call failed", err);
    return { ok: false, message: "تعذّر الاتصال بخدمة البوت (قد تكون في وضع السكون — أعد المحاولة بعد دقيقة)" };
  }
}

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const numOrNull = (f: FormData, k: string) => {
  const v = str(f, k);
  return v ? Number(v) : null;
};

export async function createSignalAction(_: ActionState, f: FormData): Promise<ActionState> {
  await assertAdmin();
  return callBot("/signals", "POST", {
    symbol: str(f, "symbol"),
    direction: str(f, "direction"),
    entry_price: numOrNull(f, "entry_price"),
    stop_loss: numOrNull(f, "stop_loss"),
    take_profit_1: numOrNull(f, "take_profit_1"),
    take_profit_2: numOrNull(f, "take_profit_2"),
    take_profit_3: numOrNull(f, "take_profit_3"),
    notes: str(f, "notes") || null,
  });
}

export async function updateSignalAction(_: ActionState, f: FormData): Promise<ActionState> {
  await assertAdmin();
  const id = str(f, "id");
  if (!id) return { ok: false, message: "اختر توصية" };
  return callBot(`/signals/${encodeURIComponent(id)}`, "PATCH", {
    status: str(f, "status"),
    exit_price: numOrNull(f, "exit_price"),
    notes: str(f, "notes") || null,
  });
}

export async function createNewsAction(_: ActionState, f: FormData): Promise<ActionState> {
  await assertAdmin();
  return callBot("/news", "POST", {
    kind: str(f, "kind") || "news",
    title: str(f, "title"),
    body: str(f, "body") || null,
    asset_class: str(f, "asset_class") || null,
    impact: str(f, "impact") || null,
    publish: f.get("publish") === "on",
  });
}

export async function updateLeadStatusAction(f: FormData): Promise<void> {
  await assertAdmin();
  const sb = getServiceClient();
  if (!sb) return;
  const { error } = await sb.from("leads").update({ status: str(f, "status") }).eq("id", str(f, "id"));
  if (error) console.error("[admin] lead update", error.message);
  revalidatePath("/admin");
}
