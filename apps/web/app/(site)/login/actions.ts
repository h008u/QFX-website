"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { REF_COOKIE, sanitizeRef } from "@/lib/referral";
import { getAuthClient } from "@/lib/supabase/server";

export interface LoginState {
  ok: boolean;
  message: string;
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : siteConfig.url;
}

/** يرسل رابط دخول سحري للبريد (ينشئ الحساب تلقائياً عند أول دخول) */
export async function sendMagicLink(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const fullName = String(form.get("full_name") ?? "").trim().slice(0, 120);
  const nextRaw = String(form.get("next") ?? "/account");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/account";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "البريد الإلكتروني غير صالح" };

  const supabase = await getAuthClient();
  if (!supabase) return { ok: false, message: "تسجيل الدخول غير متاح في الوضع التجريبي (اربط Supabase أولاً)" };

  const ref = sanitizeRef((await cookies()).get(REF_COOKIE)?.value);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      // تُحفظ في raw_user_meta_data وينسخها trigger إلى profiles عند إنشاء الحساب
      data: { ...(fullName ? { full_name: fullName } : {}), ...(ref ? { referred_by: ref } : {}) },
    },
  });
  if (error) {
    console.error("[auth] otp", error.message);
    const rate = /rate|too many/i.test(error.message);
    return { ok: false, message: rate ? "طلبات كثيرة، حاول بعد دقائق" : "تعذّر إرسال الرابط، حاول مرة أخرى" };
  }
  return { ok: true, message: `أرسلنا رابط الدخول إلى ${email} — افتح بريدك واضغط الرابط.` };
}

export async function signOut() {
  const supabase = await getAuthClient();
  await supabase?.auth.signOut();
  redirect("/");
}
