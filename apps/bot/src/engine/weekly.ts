import { escapeHtml, isSlotDue, localParts, POST_KIND_LABEL, type BotSettings, type PostKind } from "@qfx/shared";
import { db } from "../supabase";
import { getBot } from "../telegram";
import { destinationsOf, getState, setState } from "./config";
import { intake } from "./intake";
import { getPrices } from "./prices";

interface PollState {
  chat_id: string;
  message_id: number;
  symbol: string;
  name: string;
  start_price: number | null;
}
interface WeeklyState {
  last_date?: string;
  poll?: PollState | null;
}

const OPTIONS = ["📈 صعود", "📉 هبوط", "↔️ تذبذب"];

/** يغلق استطلاع الأسبوع الماضي ويقارن توقع الأغلبية بالحركة الفعلية */
async function closePreviousPoll(p: PollState): Promise<string | null> {
  try {
    const poll = await getBot().api.stopPoll(p.chat_id, p.message_id);
    const total = poll.total_voter_count;
    if (!total) return `🗳 لم يصوّت أحد على توقعات ${escapeHtml(p.name)} الأسبوع الماضي.`;
    const top = [...poll.options].sort((a, b) => b.voter_count - a.voter_count)[0];
    const pct = Math.round((top.voter_count / total) * 100);
    let line = `🗳 توقعاتكم الأسبوع الماضي لـ${escapeHtml(p.name)}: ${escapeHtml(top.text)} (${pct}% من ${total} صوت)`;
    if (p.start_price) {
      try {
        const now = (await getPrices([p.symbol])).get(p.symbol);
        if (now) {
          const ch = ((now - p.start_price) / p.start_price) * 100;
          const actual = Math.abs(ch) < 0.5 ? OPTIONS[2] : ch > 0 ? OPTIONS[0] : OPTIONS[1];
          line += ` — النتيجة: ${ch > 0 ? "+" : ""}${ch.toFixed(2)}% ${actual === top.text ? "✅ توقع صحيح" : "❌"}`;
        }
      } catch {
        /* الأسعار غير متاحة */
      }
    }
    return line;
  } catch (e) {
    console.error("[weekly] stopPoll", e instanceof Error ? e.message : e);
    return null;
  }
}

/** ملخص الأسبوع: أداء التوصيات + عدد المنشورات + نتيجة الاستطلاع، ثم استطلاع جديد */
export async function postWeekly(s: BotSettings, now = new Date(), force = false) {
  const st = await getState<WeeklyState>("weekly", {});
  const since = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();

  const { data: sigs } = await db()
    .from("signals")
    .select("symbol, status, result_pips")
    .gte("closed_at", since)
    .in("status", ["tp_hit", "sl_hit", "closed"]);
  const closed = sigs ?? [];
  const wins = closed.filter((x) => x.status === "tp_hit" || (x.status === "closed" && Number(x.result_pips) > 0)).length;
  const losses = closed.filter((x) => x.status === "sl_hit" || (x.status === "closed" && Number(x.result_pips) < 0)).length;
  const pips = Math.round(closed.reduce((a, x) => a + Number(x.result_pips ?? 0), 0) * 10) / 10;

  const { data: posts } = await db().from("posts").select("kind").gte("published_at", since).in("status", ["published", "partial"]);
  const byKind = new Map<string, number>();
  posts?.forEach((p) => byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + 1));

  const lines = ["📅 <b>ملخص الأسبوع</b>", ""];
  if (closed.length) {
    lines.push(
      "📊 <b>أداء التوصيات</b>",
      `الصفقات المغلقة: ${closed.length} • رابحة: ${wins} • خاسرة: ${losses}`,
      `النسبة: ${wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0}% • النقاط: ${pips > 0 ? "+" : ""}${pips}`,
      "",
    );
  }
  if (byKind.size) {
    lines.push("📰 <b>ما نشرناه هذا الأسبوع</b>");
    for (const [k, n] of byKind) lines.push(`• ${POST_KIND_LABEL[k as PostKind] ?? k}: ${n}`);
    lines.push("");
  }
  if (st.poll) {
    const res = await closePreviousPoll(st.poll);
    if (res) lines.push(res, "");
  }
  lines.push("شكراً لمتابعتكم، ونلقاكم الأسبوع القادم 🌙");

  const date = localParts(now, s.general.timezone).date;
  const r = await intake(
    { kind: "weekly", title: "ملخص الأسبوع", body: lines.join("\n"), format: "html", external_id: force ? null : `weekly:${date}`, policy: null, skipRules: true },
    s,
    now,
  );

  // استطلاع الأسبوع القادم في أول مكان يقبل ملخص الأسبوع
  let poll: PollState | null = null;
  if (s.weekly.poll.enabled) {
    const dest = destinationsOf(s).find((d) => d.enabled && (d.kinds === "all" || d.kinds.includes("weekly")));
    if (dest) {
      try {
        const msg = await getBot().api.sendPoll(dest.chat_id, `ما توقعك لـ${s.weekly.poll.name} الأسبوع القادم؟`, OPTIONS, {
          is_anonymous: true,
          ...(dest.thread_id ? { message_thread_id: dest.thread_id } : {}),
        });
        let start: number | null = null;
        try {
          start = (await getPrices([s.weekly.poll.symbol])).get(s.weekly.poll.symbol) ?? null;
        } catch {
          /* بدون سعر البداية لا تُحسب النتيجة */
        }
        poll = { chat_id: dest.chat_id, message_id: msg.message_id, symbol: s.weekly.poll.symbol, name: s.weekly.poll.name, start_price: start };
      } catch (e) {
        console.error("[weekly] sendPoll", e instanceof Error ? e.message : e);
      }
    }
  }
  await setState("weekly", { last_date: force ? st.last_date : date, poll: poll ?? null });
  return { outcome: r.outcome, poll: Boolean(poll) };
}

export async function runWeekly(s: BotSettings, now = new Date()) {
  const st = await getState<WeeklyState>("weekly", {});
  const { due } = isSlotDue({ now, timeZone: s.general.timezone, time: s.weekly.time, days: [s.weekly.day], lastRunDate: st.last_date });
  return due ? postWeekly(s, now) : { skipped: "not_due" };
}
