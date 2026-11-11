import { destinationAccepts, renderMarkup, type BotSettings, type Destination } from "@qfx/shared";
import { getBot } from "../telegram";
import { db } from "../supabase";
import { destinationsOf, loadSettings } from "./config";
import { translateHtml } from "./fetch";
import type { DestResult, PostRow } from "./types";

const CAPTION_LIMIT = 1024;

/** نص المنشور النهائي (HTML) مع التحذير والتوقيع */
export function composeHtml(post: Pick<PostRow, "body" | "format" | "disclaimer">, s: BotSettings): string {
  const parts = [post.format === "html" ? post.body : renderMarkup(post.body)];
  if (post.disclaimer && s.general.disclaimer.trim()) parts.push(`<i>${renderMarkup(s.general.disclaimer.trim())}</i>`);
  if (s.general.signature.trim()) parts.push(renderMarkup(s.general.signature.trim()));
  return parts.join("\n\n");
}

async function sendTo(dest: Destination, post: PostRow, html: string, replyTo?: number): Promise<number> {
  const api = getBot().api;
  const base = {
    parse_mode: "HTML" as const,
    ...(dest.thread_id ? { message_thread_id: dest.thread_id } : {}),
    ...(replyTo ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } } : {}),
  };
  if (post.photo_url) {
    if (html.length <= CAPTION_LIMIT) {
      return (await api.sendPhoto(dest.chat_id, post.photo_url, { ...base, caption: html })).message_id;
    }
    // النص أطول من حد التعليق: الصورة أولاً ثم النص كرد عليها
    const photo = await api.sendPhoto(dest.chat_id, post.photo_url, base);
    await api.sendMessage(dest.chat_id, html, {
      ...base,
      reply_parameters: { message_id: photo.message_id, allow_sending_without_reply: true },
      link_preview_options: { is_disabled: true },
    });
    return photo.message_id;
  }
  return (await api.sendMessage(dest.chat_id, html, { ...base, link_preview_options: { is_disabled: !post.source_url } }))
    .message_id;
}

const errText = (e: unknown) => {
  // HttpError من grammY يخفي السبب الحقيقي (شبكة/مهلة) داخل e.error
  const inner = (e as { error?: { message?: string; cause?: { message?: string } } })?.error;
  const cause = inner?.cause?.message ?? inner?.message;
  const msg = e instanceof Error ? e.message : String(e);
  return (cause && !msg.includes(cause) ? `${msg} (${cause})` : msg).slice(0, 300);
};

export interface PublishOptions {
  onlyFailed?: boolean; // إعادة الإرسال للأماكن التي فشلت فقط
  approvedBy?: string | null;
  force?: boolean; // نشر عنصر مرفوض/مفلتر/مكرر يدوياً
}

/**
 * ينشر منشوراً في كل أماكن النشر التي تقبل نوعه. يحجز المنشور أولاً (status = publishing)
 * حتى لا ينشر مرتين إذا اشتغلت الجدولة والنشر اليدوي سوا.
 */
export async function publishPost(id: string, opts: PublishOptions = {}): Promise<PostRow> {
  const allowed = opts.onlyFailed
    ? ["failed", "partial"]
    : opts.force
      ? ["draft", "pending", "scheduled", "failed", "rejected", "filtered", "duplicate"]
      : ["draft", "pending", "scheduled", "failed"];
  const { data: claimed, error } = await db()
    .from("posts")
    .update({ status: "publishing", ...(opts.approvedBy ? { approved_by: opts.approvedBy } : {}) })
    .eq("id", id)
    .in("status", allowed)
    .select()
    .maybeSingle<PostRow>();
  if (error) throw error;
  if (!claimed) throw new Error("المنشور غير موجود أو حالته لا تسمح بالنشر");

  const s = await loadSettings();
  const html = composeHtml(claimed, s);
  const dests = destinationsOf(s).filter((d) => destinationAccepts(d, claimed.kind));
  const previous = claimed.results ?? [];
  const keep = opts.onlyFailed ? previous.filter((r) => r.ok) : [];
  const targets = opts.onlyFailed ? dests.filter((d) => !keep.some((r) => r.dest === d.id)) : dests;

  // رسالة المنشور الأصلي في كل مكان (للرد عليه)
  let parentResults: DestResult[] = [];
  if (claimed.reply_to) {
    const { data } = await db().from("posts").select("results").eq("id", claimed.reply_to).maybeSingle();
    parentResults = (data?.results as DestResult[]) ?? [];
  }

  const results: DestResult[] = [...keep];
  for (const dest of targets) {
    const replyTo = parentResults.find((r) => r.dest === dest.id && r.ok)?.message_id;
    try {
      // نسخة بلغة ثانية لهذا المكان (التنسيق يبقى)
      const localized = dest.lang && dest.lang !== "ar" ? await translateHtml(html, dest.lang) : html;
      const message_id = await sendTo(dest, claimed, localized, replyTo);
      results.push({ dest: dest.id, chat_id: dest.chat_id, ok: true, message_id, at: new Date().toISOString() });
    } catch (e) {
      console.error(`[publish] ${claimed.id} → ${dest.chat_id}`, errText(e));
      results.push({ dest: dest.id, chat_id: dest.chat_id, ok: false, error: errText(e), at: new Date().toISOString() });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  const status = !dests.length ? "failed" : okCount === results.length ? "published" : okCount ? "partial" : "failed";
  const { data: updated, error: upErr } = await db()
    .from("posts")
    .update({
      status,
      results,
      published_at: okCount ? new Date().toISOString() : null,
      reason: dests.length ? (status === "published" ? null : claimed.reason) : "لا يوجد مكان نشر يقبل هذا النوع",
    })
    .eq("id", id)
    .select()
    .single<PostRow>();
  if (upErr) throw upErr;
  return updated;
}

/** أول رسالة ناجحة للمنشور (لربطها بالتوصية) */
export const firstMessageId = (p: PostRow) => p.results.find((r) => r.ok)?.message_id ?? null;
