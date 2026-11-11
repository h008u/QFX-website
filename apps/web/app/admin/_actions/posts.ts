"use server";

import { sanitizeTelegramHtml } from "@qfx/shared";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { callBot } from "@/lib/admin/bot-api";
import { fromLocalInput } from "@/lib/admin/format";
import { audit, requireRole, type AdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";

const refresh = () => {
  for (const p of ["/admin", "/admin/flow", "/admin/review", "/admin/calendar", "/admin/compose"]) revalidatePath(p);
};

async function titleOf(ctx: AdminContext, id: string) {
  const { data } = await ctx.db.from("posts").select("title, body").eq("id", id).maybeSingle();
  return (data?.title || data?.body || "").replace(/[*_`<>]/g, "").slice(0, 80);
}

/** في وضع المعاينة نحاكي النشر */
async function simulatePublish(ctx: AdminContext, id: string): Promise<ActionResult> {
  const s = await loadAdminSettings(ctx);
  const results = s.destinations.map((d) => ({ dest: d.id, chat_id: d.chat_id, ok: true, message_id: 1000, at: new Date().toISOString() }));
  await ctx.db.from("posts").update({ status: "published", published_at: new Date().toISOString(), results, reason: null, approved_by: ctx.user.id }).eq("id", id);
  return { ok: true, message: "تم النشر (محاكاة في وضع المعاينة) ✅" };
}

/** نشر الآن / موافقة / نشر عنصر مفلتر رغم ذلك / إعادة الإرسال للأماكن الفاشلة */
export async function publishPostAction(id: string, opts: { onlyFailed?: boolean; force?: boolean } = {}): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const target = await titleOf(ctx, id);
  let res: ActionResult;
  if (ctx.demo) {
    res = await simulatePublish(ctx, id);
  } else {
    const r = await callBot<{ post: { status: string } }>(`/posts/${id}/publish`, "POST", { only_failed: opts.onlyFailed, force: opts.force, approved_by: ctx.user.id });
    res = r.ok
      ? { ok: r.data?.post.status !== "failed", message: r.data?.post.status === "published" ? "تم النشر ✅" : `الحالة: ${r.data?.post.status}` }
      : { ok: false, message: r.error ?? "فشل" };
  }
  await audit(ctx, opts.onlyFailed ? "post.resend" : opts.force ? "post.force_publish" : "post.publish", target);
  refresh();
  return res;
}

export async function rejectPostAction(id: string): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const { data, error } = await ctx.db
    .from("posts")
    .update({ status: "rejected", reason: `رفضه ${ctx.user.name}` })
    .eq("id", id)
    .in("status", ["pending", "scheduled", "draft", "failed"])
    .select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "لم يعد بالإمكان رفضه (تغيّرت حالته)" };
  await audit(ctx, "post.reject", await titleOf(ctx, id));
  refresh();
  return { ok: true, message: "تم الرفض" };
}

export async function updatePostBodyAction(id: string, body: string): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const text = body.trim();
  if (!text || text.length > 4000) return { ok: false, message: "النص فارغ أو أطول من 4000 حرف" };
  const { data: post } = await ctx.db.from("posts").select("format, status").eq("id", id).maybeSingle();
  if (!post) return { ok: false, message: "غير موجود" };
  if (post.status === "published" || post.status === "publishing") return { ok: false, message: "لا يمكن تعديل منشور منشور" };
  const clean = post.format === "html" ? sanitizeTelegramHtml(text) : text;
  const { error } = await ctx.db.from("posts").update({ body: clean }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  await audit(ctx, "post.edit", await titleOf(ctx, id));
  refresh();
  return { ok: true, message: "تم حفظ التعديل" };
}

export async function reschedulePostAction(id: string, localValue: string): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const s = await loadAdminSettings(ctx);
  const iso = fromLocalInput(localValue, s.general.timezone);
  if (new Date(iso).getTime() < Date.now() - 60_000) return { ok: false, message: "الوقت في الماضي" };
  const { data, error } = await ctx.db
    .from("posts")
    .update({ status: "scheduled", scheduled_at: iso })
    .eq("id", id)
    .in("status", ["scheduled", "draft", "pending"])
    .select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "لا يمكن جدولته" };
  await audit(ctx, "post.reschedule", await titleOf(ctx, id), { at: iso });
  refresh();
  return { ok: true, message: "تم تغيير الموعد" };
}

export async function cancelScheduledAction(id: string): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const { data, error } = await ctx.db
    .from("posts")
    .update({ status: "rejected", reason: `ألغاه ${ctx.user.name}` })
    .eq("id", id)
    .eq("status", "scheduled")
    .select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "ليس مجدولاً" };
  await audit(ctx, "post.cancel", await titleOf(ctx, id));
  refresh();
  return { ok: true, message: "تم إلغاء الجدولة" };
}

export interface ComposeInput {
  body: string;
  photo_url?: string | null;
  disclaimer: boolean;
  when: "now" | "schedule" | "draft";
  scheduled_local?: string | null;
}

/** منشور جديد: الآن أو مجدول أو مسودة */
export async function createPostAction(input: ComposeInput): Promise<ActionResult> {
  const ctx = await requireRole("editor");
  const body = input.body.trim();
  if (!body) return { ok: false, message: "اكتب نص المنشور" };
  if (body.length > 4000) return { ok: false, message: "النص أطول من 4000 حرف" };
  if (input.photo_url && !/^https:\/\//.test(input.photo_url) && !(ctx.demo && input.photo_url.startsWith("/demo/"))) {
    return { ok: false, message: "رابط الصورة يجب أن يبدأ بـ https://" };
  }
  const s = await loadAdminSettings(ctx);
  let scheduled_at: string | null = new Date().toISOString();
  if (input.when === "schedule") {
    if (!input.scheduled_local) return { ok: false, message: "حدد وقت النشر" };
    scheduled_at = fromLocalInput(input.scheduled_local, s.general.timezone);
    if (new Date(scheduled_at).getTime() < Date.now()) return { ok: false, message: "وقت النشر في الماضي" };
  }
  const { data, error } = await ctx.db
    .from("posts")
    .insert({
      kind: "manual",
      status: input.when === "draft" ? "draft" : "scheduled",
      body,
      photo_url: input.photo_url || null,
      disclaimer: input.disclaimer,
      scheduled_at: input.when === "draft" ? null : scheduled_at,
      source: ctx.user.name,
      created_by: ctx.demo ? null : ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  await audit(ctx, `post.${input.when === "now" ? "create_publish" : input.when}`, body.replace(/[*_`]/g, "").slice(0, 80));
  if (input.when === "now") {
    const r = await publishPostAction(data.id);
    return r;
  }
  refresh();
  return { ok: true, message: input.when === "draft" ? "حُفظت المسودة" : "تمت الجدولة ✅" };
}
