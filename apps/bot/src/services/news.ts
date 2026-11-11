import { formatNewsMessage, type NewsInput, type NewsItem } from "@qfx/shared";
import { firstMessageId, publishPost } from "../engine/publish";
import { db } from "../supabase";

/** يحفظ خبراً/تحليلاً وينشره في القناة (اختيارياً) */
export async function createNews(input: NewsInput, opts: { publish?: boolean } = {}): Promise<NewsItem> {
  const title = input.title?.trim();
  if (!title || title.length < 2) throw new Error("العنوان مطلوب");

  const row = {
    kind: input.kind ?? "news",
    title: title.slice(0, 300),
    body: input.body?.trim() || null,
    asset_class: input.asset_class ?? null,
    impact: input.impact ?? null,
    currency: input.currency ?? null,
    source: input.source ?? "QFX",
    source_url: input.source_url ?? null,
    external_id: input.external_id ?? null,
    event_time: input.event_time ?? null,
  };
  const { data, error } = await db().from("news").insert(row).select().single<NewsItem>();
  if (error) throw error;

  if (opts.publish !== false) {
    try {
      const { data: post, error: postErr } = await db()
        .from("posts")
        .insert({
          kind: "manual",
          status: "scheduled",
          title: row.title,
          body: formatNewsMessage(row),
          format: "html",
          disclaimer: row.kind === "analysis",
          source: "المجتمع",
          scheduled_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (postErr) throw postErr;
      const published = await publishPost(post.id);
      const messageId = firstMessageId(published);
      await db().from("news").update({ published_to_telegram: Boolean(messageId), telegram_message_id: messageId }).eq("id", data.id);
      data.published_to_telegram = true;
      data.telegram_message_id = messageId;
    } catch (err) {
      console.error("[news] telegram publish failed", err);
    }
  }
  return data;
}
