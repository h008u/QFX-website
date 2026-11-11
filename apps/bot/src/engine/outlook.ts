// نظرة الأسبوع (الأحد صباحاً): أهم أحداث الأسبوع + التوصيات المفتوحة (فكرة من Spir)
import { CURRENCY_LABEL, escapeHtml, IMPACT_ICON, isSlotDue, localParts, type BotSettings } from "@qfx/shared";
import { db } from "../supabase";
import { getState, setState } from "./config";
import { intake } from "./intake";

export async function postOutlook(s: BotSettings, now = new Date(), force = false) {
  const tz = s.general.timezone;
  const { data: events } = await db()
    .from("news")
    .select("title, currency, impact, event_time")
    .eq("kind", "calendar")
    .eq("impact", "high")
    .gte("event_time", now.toISOString())
    .lte("event_time", new Date(now.getTime() + 7 * 86400_000).toISOString())
    .order("event_time")
    .limit(40);
  const { data: open } = await db().from("signals").select("symbol, direction, entry_price").in("status", ["open", "pending"]).limit(20);

  const dayFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { weekday: "long", day: "numeric", month: "short", timeZone: tz });
  const timeFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
  const lines = ["🔭 <b>نظرة على الأسبوع</b>", ""];
  if (events?.length) {
    lines.push("🗓 <b>أهم الأخبار المنتظرة</b>");
    let lastDay = "";
    for (const e of events) {
      const d = dayFmt.format(new Date(e.event_time));
      if (d !== lastDay) {
        lines.push("", `<b>${escapeHtml(d)}</b>`);
        lastDay = d;
      }
      lines.push(`${IMPACT_ICON[e.impact as "high"]} ${timeFmt.format(new Date(e.event_time))} | ${escapeHtml(CURRENCY_LABEL[e.currency] ?? e.currency)} — ${escapeHtml(e.title)}`);
    }
  } else {
    lines.push("لا أخبار عالية التأثير مسجّلة لهذا الأسبوع حتى الآن.");
  }
  if (open?.length) {
    lines.push("", "📌 <b>توصيات ما زالت مفتوحة</b>");
    for (const o of open) lines.push(`• ${o.direction === "BUY" ? "🟢" : "🔴"} ${escapeHtml(o.symbol)} @ ${Number(o.entry_price)}`);
  }
  lines.push("", "<i>أسبوعاً موفقاً، والتزموا بإدارة رأس المال.</i>");
  const date = localParts(now, tz).date;
  const r = await intake(
    { kind: "outlook", title: "نظرة الأسبوع", body: lines.join("\n"), format: "html", external_id: force ? null : `outlook:${date}`, policy: null, skipRules: true },
    s,
    now,
  );
  if (!force) await setState("outlook", { last_date: date });
  return { outcome: r.outcome, events: events?.length ?? 0 };
}

export async function runOutlook(s: BotSettings, now = new Date()) {
  const st = await getState<{ last_date?: string }>("outlook", {});
  const { due } = isSlotDue({ now, timeZone: s.general.timezone, time: s.outlook.time, days: [s.outlook.day], lastRunDate: st.last_date });
  return due ? postOutlook(s, now) : { skipped: "not_due" };
}
