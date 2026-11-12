"use server";

import { revalidatePath } from "next/cache";
import { normalizeContent, type SiteContent } from "@/config/site-content";
import { audit, getAdminContext } from "@/lib/admin/session";
import { CONTENT_KEY } from "@/lib/site-settings";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthClient } from "@/lib/supabase/server";

/** هل الزائر الحالي من الفريق (محرر أو مدير)؟ — لتفعيل وضع التعديل المباشر، بدون أي تحويل */
export async function canEditSiteAction(): Promise<boolean> {
  if (!isSupabaseConfigured) return true; // وضع المعاينة
  const sb = await getAuthClient();
  if (!sb) return false;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await sb.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" || data?.role === "editor";
}

/** يحفظ محتوى الموقع (المحرر والمدير) ويعيد بناء الصفحات */
export async function saveSiteContentAction(content: SiteContent): Promise<{ ok: boolean; message: string }> {
  if (!(await canEditSiteAction())) return { ok: false, message: "ليست لديك صلاحية تعديل الموقع" };
  const ctx = await getAdminContext();
  if (!ctx || ctx.role === "viewer") return { ok: false, message: "ليست لديك صلاحية تعديل الموقع" };
  const value = normalizeContent(content);
  const { data: existing } = await ctx.db.from("settings").select("key").eq("key", CONTENT_KEY).maybeSingle();
  const { error } = existing
    ? await ctx.db.from("settings").update({ value, updated_by: ctx.demo ? null : ctx.user.id }).eq("key", CONTENT_KEY)
    : await ctx.db.from("settings").insert({ key: CONTENT_KEY, value, updated_by: ctx.demo ? null : ctx.user.id });
  if (error) return { ok: false, message: error.message };
  await audit(ctx, "site.content.save", null, { sections: value.sections.filter((s) => s.visible).map((s) => s.id) });
  revalidatePath("/", "layout");
  return { ok: true, message: "تم حفظ محتوى الموقع ✅" };
}
