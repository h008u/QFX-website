"use server";

import type { ActionResult } from "@/components/admin/ui";
import { pushToStaff } from "@/lib/admin/push";
import { requireRole } from "@/lib/admin/session";

export async function savePushSubscriptionAction(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, ua: string): Promise<ActionResult> {
  const ctx = await requireRole("viewer");
  if (ctx.demo) return { ok: false, message: "الإشعارات تحتاج Supabase (غير متاحة في وضع المعاينة)" };
  if (!/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false, message: "اشتراك غير صالح" };
  await ctx.db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await ctx.db.from("push_subscriptions").insert({
    profile_id: ctx.user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: ua.slice(0, 200),
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "تم تفعيل الإشعارات على هذا الجهاز ✅" };
}

export async function testPushAction(): Promise<ActionResult> {
  await requireRole("viewer");
  const n = await pushToStaff("تجربة إشعار QFX", "إذا وصلك هذا فالإشعارات تعمل 🎉", "/admin");
  return n ? { ok: true, message: `أُرسل إلى ${n} جهاز` } : { ok: false, message: "لا أجهزة مشتركة أو مفاتيح VAPID غير مضبوطة" };
}
