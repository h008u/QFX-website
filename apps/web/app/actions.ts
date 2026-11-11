"use server";

import { cookies } from "next/headers";
import { pushToStaff } from "@/lib/admin/push";
import { REF_COOKIE, sanitizeRef } from "@/lib/referral";
import { getServerClient } from "@/lib/supabase/server";

export interface LeadState {
  ok: boolean;
  message: string;
}

const clean = (v: FormDataEntryValue | null, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** يحفظ طلب انضمام في جدول leads (CRM المصغّر) — مسموح للزوار عبر RLS (إدراج فقط) */
export async function submitLead(_prev: LeadState, form: FormData): Promise<LeadState> {
  // حقل مخفي لاصطياد البوتات
  if (clean(form.get("website"))) return { ok: true, message: "تم استلام طلبك" };

  const full_name = clean(form.get("full_name"));
  const email = clean(form.get("email")) || null;
  const phone = clean(form.get("phone"), 30) || null;
  const telegram_username = clean(form.get("telegram"), 64).replace(/^@/, "") || null;
  const broker_account_id = clean(form.get("broker_account_id"), 64) || null;

  if (full_name.length < 2) return { ok: false, message: "يرجى كتابة الاسم" };
  if (!email && !phone && !telegram_username) return { ok: false, message: "أضف وسيلة تواصل واحدة على الأقل" };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "البريد الإلكتروني غير صالح" };

  const sb = getServerClient();
  if (!sb) return { ok: false, message: "قاعدة البيانات غير مهيأة بعد (وضع تجريبي)" };

  const { error } = await sb.from("leads").insert({
    full_name,
    email,
    phone,
    telegram_username,
    broker_account_id,
    referral_source:
      sanitizeRef(clean(form.get("ref"), 64)) ?? sanitizeRef((await cookies()).get(REF_COOKIE)?.value) ?? "website",
  });
  if (error) {
    console.error("[lead] insert failed", error.message);
    return { ok: false, message: "تعذّر إرسال الطلب، حاول مرة أخرى" };
  }
  await pushToStaff("👤 طلب انضمام جديد", `${full_name}${telegram_username ? ` (@${telegram_username})` : ""}`, "/admin/crm").catch(() => 0);
  return { ok: true, message: "تم استلام طلبك! سنتواصل معك لتأكيد تفعيل حسابك وإضافتك لقناة التوصيات." };
}
