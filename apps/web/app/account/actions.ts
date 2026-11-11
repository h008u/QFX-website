"use server";

import { revalidatePath } from "next/cache";
import { getAuthClient } from "@/lib/supabase/server";

export interface ProfileState {
  ok: boolean;
  message: string;
}

export async function updateProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const supabase = await getAuthClient();
  const user = (await supabase?.auth.getUser())?.data.user;
  if (!supabase || !user) return { ok: false, message: "يرجى تسجيل الدخول" };

  const full_name = String(form.get("full_name") ?? "").trim().slice(0, 120) || null;
  const telegram_username =
    String(form.get("telegram_username") ?? "")
      .trim()
      .replace(/^@/, "")
      .slice(0, 64) || null;
  if (telegram_username && !/^[A-Za-z0-9_]{4,64}$/.test(telegram_username)) {
    return { ok: false, message: "معرّف تيليجرام غير صالح" };
  }

  // RLS + صلاحيات الأعمدة تسمح للعضو بتعديل هذين الحقلين فقط
  const { error } = await supabase.from("profiles").update({ full_name, telegram_username }).eq("id", user.id);
  if (error) {
    console.error("[account] update", error.message);
    return { ok: false, message: "تعذّر الحفظ" };
  }
  revalidatePath("/account");
  return { ok: true, message: "تم الحفظ ✅" };
}
