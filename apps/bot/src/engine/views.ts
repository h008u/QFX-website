// مشاهدات المنشورات: تيليجرام لا يعطي البوت عدد المشاهدات، لكن القنوات العامة لها صفحة معاينة
// (t.me/s/اسم_القناة) فيها المشاهدات لكل منشور. نقرأها ونطابقها مع ما نشره البوت (منقول من Spir).
import type { BotSettings } from "@qfx/shared";
import { db } from "../supabase";
import { getBot } from "../telegram";
import { destinationsOf } from "./config";
import { fetchWithTimeout } from "./fetch";
import type { DestResult } from "./types";

export function parseCount(s = ""): number | null {
  const m = String(s).trim().replace(/,/g, "").match(/^([\d.]+)\s*([KM])?/i);
  if (!m) return null;
  return Math.round(Number(m[1]) * (({ K: 1e3, M: 1e6 } as Record<string, number>)[(m[2] || "").toUpperCase()] || 1));
}

/** { رقم الرسالة: المشاهدات } من صفحة المعاينة */
export function parsePreview(html: string, username: string): Record<number, number> {
  const out: Record<number, number> = {};
  for (const chunk of String(html).split('data-post="').slice(1)) {
    const [post] = chunk.split('"');
    const [u, id] = post.split("/");
    if (!id || u.toLowerCase() !== username.toLowerCase()) continue;
    const v = chunk.match(/tgme_widget_message_views">([^<]+)</);
    const n = v ? parseCount(v[1]) : null;
    if (n !== null) out[Number(id)] = n;
  }
  return out;
}

async function channelViews(username: string, oldest: number): Promise<Record<number, number>> {
  const views: Record<number, number> = {};
  let before = "";
  for (let page = 0; page < 4; page++) {
    const res = await fetchWithTimeout(`https://t.me/s/${encodeURIComponent(username)}${before}`, {}, 12_000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const got = parsePreview(await res.text(), username);
    const ids = Object.keys(got).map(Number);
    if (!ids.length) break;
    Object.assign(views, got);
    const min = Math.min(...ids);
    if (min <= oldest) break;
    before = `?before=${min}`;
  }
  return views;
}

/** مهمة كل ساعة: تحدّث posts.views لمنشورات آخر 7 أيام في القنوات العامة */
export async function runViews(s: BotSettings) {
  const dests = destinationsOf(s).filter((d) => d.enabled && !d.thread_id);
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data, error } = await db().from("posts").select("id, results").in("status", ["published", "partial"]).gte("published_at", since).limit(500);
  if (error) throw error;
  const posts = (data ?? []) as { id: string; results: DestResult[] }[];
  const totals = new Map<string, number>();
  const report: Record<string, number | string> = {};

  for (const d of dests) {
    let username = d.chat_id.startsWith("@") ? d.chat_id.slice(1) : null;
    if (!username) {
      try {
        const chat = await getBot().api.getChat(d.chat_id);
        username = chat.type === "channel" && "username" in chat && chat.username ? chat.username : null;
      } catch {
        username = null;
      }
    }
    if (!username) continue; // قناة خاصة أو مجموعة: لا توجد مشاهدات عامة
    const mine = posts.flatMap((p) => p.results.filter((r) => r.dest === d.id && r.ok && r.message_id).map((r) => ({ id: p.id, msg: r.message_id! })));
    if (!mine.length) continue;
    try {
      const views = await channelViews(username, Math.min(...mine.map((m) => m.msg)));
      let matched = 0;
      for (const m of mine) {
        if (views[m.msg] !== undefined) {
          totals.set(m.id, (totals.get(m.id) ?? 0) + views[m.msg]);
          matched++;
        }
      }
      report[d.id] = matched;
    } catch (e) {
      report[d.id] = e instanceof Error ? e.message : String(e);
    }
  }
  for (const [id, views] of totals) await db().from("posts").update({ views }).eq("id", id);
  return { updated: totals.size, destinations: report };
}
