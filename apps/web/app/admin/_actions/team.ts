"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { audit, privilegedDb, requireRole } from "@/lib/admin/session";

const ROLES = ["admin", "editor", "viewer", "member"];

/** تغيير دور عضو (المدير فقط) — يستخدم service_role لأن العمود محمي من التعديل المباشر */
export async function setRoleAction(profileId: string, role: string): Promise<ActionResult> {
  const ctx = await requireRole("admin");
  if (!ROLES.includes(role)) return { ok: false, message: "دور غير صالح" };
  const db = privilegedDb(ctx);
  if (!db) return { ok: false, message: "أضف SUPABASE_SERVICE_ROLE_KEY في إعدادات الموقع" };
  if (profileId === ctx.user.id && role !== "admin") {
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return { ok: false, message: "لا يمكن إزالة آخر مدير" };
  }
  const { data, error } = await db.from("profiles").update({ role }).eq("id", profileId).select("full_name");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "العضو غير موجود" };
  await audit(ctx, "team.role", `${data[0].full_name ?? profileId.slice(0, 8)} → ${role}`);
  revalidatePath("/admin/team");
  return { ok: true, message: "تم تغيير الدور" };
}

/** إضافة عضو للفريق عبر بريده (يجب أن يكون قد سجّل دخوله للموقع مرة واحدة على الأقل) */
export async function addByEmailAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const ctx = await requireRole("admin");
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const role = String(f.get("role") ?? "editor");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "البريد غير صالح" };
  if (ctx.demo) return { ok: false, message: "غير متاح في وضع المعاينة — غيّر الدور من القائمة" };
  const db = privilegedDb(ctx);
  if (!db) return { ok: false, message: "أضف SUPABASE_SERVICE_ROLE_KEY في إعدادات الموقع" };
  let page = 1;
  let userId: string | null = null;
  while (!userId && page <= 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { ok: false, message: error.message };
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 200) break;
    page++;
  }
  if (!userId) return { ok: false, message: "لا يوجد حساب بهذا البريد — اطلب منه تسجيل الدخول للموقع أولاً (/login)" };
  return setRoleAction(userId, role);
}
