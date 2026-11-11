import { InlineKeyboard } from "grammy";
import { getEnv } from "../env";
import { getBot } from "../telegram";
import { loadSettings } from "./config";
import { composeHtml } from "./publish";
import type { PostRow } from "./types";

/** يرسل المنشور للمدراء بالخاص مع أزرار نشر/تجاهل */
export async function notifyAdmins(post: PostRow, headline: string) {
  const { adminIds, siteUrl } = getEnv();
  if (!adminIds.size) return;
  const s = await loadSettings();
  const preview = composeHtml(post, s);
  const text = `${headline}\n${post.reason ? `<i>${post.reason}</i>\n` : ""}${post.score !== null ? `التقييم: ${post.score}/100\n` : ""}\n${preview}`.slice(0, 4000);
  const kb = new InlineKeyboard().text("✅ نشر", `p:a:${post.id}`).text("❌ تجاهل", `p:r:${post.id}`);
  if (siteUrl) kb.row().url("فتح في اللوحة", `${siteUrl}/admin/review`);
  for (const id of adminIds) {
    try {
      await getBot().api.sendMessage(id, text, { parse_mode: "HTML", reply_markup: kb, link_preview_options: { is_disabled: true } });
    } catch (e) {
      console.error("[approvals] DM failed", id, e instanceof Error ? e.message : e);
    }
  }
}

/** رسالة نصية للمدراء (تنبيهات الصحة) */
export async function messageAdmins(html: string) {
  for (const id of getEnv().adminIds) {
    try {
      await getBot().api.sendMessage(id, html, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    } catch {
      /* تجاهل */
    }
  }
}
