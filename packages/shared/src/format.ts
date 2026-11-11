import { ASSET_LABEL, CURRENCY_LABEL, DIRECTION_LABEL, IMPACT_ICON, IMPACT_LABEL, NEWS_KIND_LABEL, STATUS_LABEL } from "./labels";
import { riskReward } from "./signals";
import type { Impact, NewsInput, Signal, SignalInput } from "./types";

/** تهريب النص لوضع parse_mode=HTML في تيليجرام */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const num = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : String(Number(n.toFixed(5)));

/** رسالة التوصية الجديدة لقناة تيليجرام */
export function formatSignalMessage(signal: SignalInput & { id?: string }, siteUrl?: string): string {
  const arrow = signal.direction === "BUY" ? "🟢" : "🔴";
  const lines: (string | undefined)[] = [
    `${arrow} <b>توصية جديدة — ${DIRECTION_LABEL[signal.direction]} ${escapeHtml(signal.symbol)}</b>`,
    signal.asset_class ? `📂 ${ASSET_LABEL[signal.asset_class]}` : undefined,
    "",
    `💰 الدخول: <code>${num(signal.entry_price)}</code>`,
    `🛑 وقف الخسارة: <code>${num(signal.stop_loss)}</code>`,
    `🎯 الهدف 1: <code>${num(signal.take_profit_1)}</code>`,
    signal.take_profit_2 ? `🎯 الهدف 2: <code>${num(signal.take_profit_2)}</code>` : undefined,
    signal.take_profit_3 ? `🎯 الهدف 3: <code>${num(signal.take_profit_3)}</code>` : undefined,
  ];
  const rr = riskReward(signal);
  if (rr) lines.push(`⚖️ العائد/المخاطرة: 1:${rr}`);
  if (signal.notes) lines.push("", `📝 ${escapeHtml(signal.notes)}`);
  if (signal.id) lines.push("", `🆔 <code>${signal.id.slice(0, 8)}</code>`);
  if (siteUrl) lines.push(`📊 سجل الأداء: ${siteUrl}/signals`);
  lines.push("", "⚠️ <i>التداول ينطوي على مخاطر عالية. التزم بإدارة رأس المال.</i>");
  return lines.filter((l) => l !== undefined).join("\n");
}

/** رسالة تحديث حالة التوصية (تُرسل كرد على الرسالة الأصلية) */
export function formatSignalUpdate(signal: Pick<Signal, "symbol" | "direction" | "status" | "result_pips" | "notes">): string {
  const pips =
    signal.result_pips === null || signal.result_pips === undefined
      ? ""
      : `\n📈 النتيجة: <b>${signal.result_pips > 0 ? "+" : ""}${signal.result_pips} نقطة</b>`;
  const notes = signal.notes ? `\n📝 ${escapeHtml(signal.notes)}` : "";
  return `🔔 <b>تحديث ${DIRECTION_LABEL[signal.direction]} ${escapeHtml(signal.symbol)}</b>\nالحالة: ${STATUS_LABEL[signal.status]}${pips}${notes}`;
}

/** رسالة خبر / تحليل */
export function formatNewsMessage(news: NewsInput): string {
  const kind = NEWS_KIND_LABEL[news.kind ?? "news"];
  const impact = news.impact ? `${IMPACT_ICON[news.impact]} ${IMPACT_LABEL[news.impact]}` : "";
  const header = `📰 <b>${escapeHtml(news.title)}</b>`;
  const meta = [kind, news.asset_class ? ASSET_LABEL[news.asset_class] : "", news.currency ?? "", impact]
    .filter(Boolean)
    .join(" • ");
  const parts = [header, meta ? `<i>${escapeHtml(meta)}</i>` : "", news.body ? `\n${escapeHtml(news.body)}` : ""];
  if (news.source_url) parts.push(`\n🔗 ${escapeHtml(news.source_url)}`);
  return parts.filter(Boolean).join("\n");
}

export interface CalendarEventView {
  title_ar: string;
  title_en: string;
  currency: string;
  impact: Impact;
  time: Date;
  forecast?: string;
  previous?: string;
}

/** ملخص المفكرة الاقتصادية لليوم */
export function formatCalendarDigest(events: CalendarEventView[], dateLabel: string, timeZone = "Asia/Riyadh"): string {
  const fmt = new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit", timeZone, hour12: false });
  const lines = [`🗓 <b>أهم أخبار المفكرة الاقتصادية — ${escapeHtml(dateLabel)}</b>`, `<i>التوقيت حسب ${timeZone}</i>`, ""];
  for (const e of events) {
    const cur = CURRENCY_LABEL[e.currency] ?? e.currency;
    lines.push(`${IMPACT_ICON[e.impact]} <b>${fmt.format(e.time)}</b> | ${escapeHtml(cur)}`);
    lines.push(`   ${escapeHtml(e.title_ar)}${e.title_ar.includes(e.title_en) ? "" : ` <i>(${escapeHtml(e.title_en)})</i>`}`);
    const fp = [e.forecast ? `المتوقع: ${escapeHtml(e.forecast)}` : "", e.previous ? `السابق: ${escapeHtml(e.previous)}` : ""]
      .filter(Boolean)
      .join(" | ");
    if (fp) lines.push(`   ${fp}`);
  }
  lines.push("", "⚠️ <i>توقّع تذبذباً عالياً قرب موعد الأخبار ذات التأثير المرتفع.</i>");
  return lines.join("\n");
}
