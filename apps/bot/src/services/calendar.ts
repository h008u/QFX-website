import {
  eventReadingText, resultReadingText, formatCalendarDigest, impactScore, localParts, CURRENCY_LABEL, IMPACT_ICON, IMPACT_LABEL,
  escapeHtml, type BotSettings, type CalendarEventView, type Impact,
} from "@qfx/shared";
import { numberOf } from "../engine/fetch";
import { intake } from "../engine/intake";
import { db } from "../supabase";
import { translateEventTitle } from "./calendar-translate";

/** مصدر مجاني لمفكرة الأسبوع بصيغة JSON (بيانات ForexFactory) */
export const CALENDAR_FEED_URL =
  process.env.CALENDAR_FEED_URL || "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

export interface RawCalendarEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast?: string;
  previous?: string;
  actual?: string;
}

export interface CalendarEvent extends CalendarEventView {
  external_id: string;
  actual?: string;
}

const IMPACT_MAP: Record<string, Impact | undefined> = { High: "high", Medium: "medium", Low: "low" };

export function filterEvents(
  raw: RawCalendarEvent[],
  opts: { currencies: Set<string>; minImpact: "high" | "medium" },
): CalendarEvent[] {
  const allowed: Impact[] = opts.minImpact === "medium" ? ["high", "medium"] : ["high"];
  return raw
    .map((e) => ({ e, impact: IMPACT_MAP[e.impact], time: new Date(e.date) }))
    .filter(
      ({ e, impact, time }) =>
        impact !== undefined && allowed.includes(impact) && opts.currencies.has(e.country.toUpperCase()) && !Number.isNaN(time.getTime()),
    )
    .map(({ e, impact, time }) => ({
      external_id: `ff:${e.country}:${e.title}:${time.toISOString()}`,
      title_en: e.title,
      title_ar: translateEventTitle(e.title),
      currency: e.country.toUpperCase(),
      impact: impact as Impact,
      time,
      forecast: e.forecast || undefined,
      previous: e.previous || undefined,
      actual: e.actual || undefined,
    }))
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

export function dayKey(d: Date, timeZone: string): string {
  return localParts(d, timeZone).date;
}

export async function fetchCalendar(): Promise<RawCalendarEvent[]> {
  const res = await fetch(CALENDAR_FEED_URL, { headers: { "User-Agent": "qfx-calendar-bot/1.0" } });
  if (!res.ok) throw new Error(`Calendar feed responded ${res.status}`);
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) throw new Error("Unexpected calendar feed format");
  return json as RawCalendarEvent[];
}

/** مزامنة أحداث الأسبوع المهمة إلى جدول news (تظهر في الموقع وصفحة الأجندة باللوحة) */
export async function syncCalendar(s: BotSettings) {
  const events = filterEvents(await fetchCalendar(), {
    currencies: new Set(s.calendar.currencies.map((c) => c.toUpperCase())),
    minImpact: s.calendar.min_impact,
  });
  if (events.length) {
    const rows = events.map((e) => ({
      kind: "calendar" as const,
      title: e.title_ar,
      body:
        [e.title_ar.includes(e.title_en) ? null : e.title_en, e.forecast ? `المتوقع: ${e.forecast}` : null, e.previous ? `السابق: ${e.previous}` : null]
          .filter(Boolean)
          .join(" | ") || null,
      impact: e.impact,
      currency: e.currency,
      event_time: e.time.toISOString(),
      source: "ForexFactory",
      external_id: e.external_id,
      // العناوين الأصلية والأرقام تُحدّث في كل مزامنة
      meta: { title_en: e.title_en, forecast: e.forecast ?? null, previous: e.previous ?? null, actual: e.actual ?? null },
    }));
    const { error } = await db().from("news").upsert(rows, { onConflict: "external_id" });
    if (error) throw error;
  }
  return { stored: events.length };
}

interface CalRow {
  external_id: string;
  title: string;
  currency: string;
  impact: Impact;
  event_time: string;
  meta: { title_en?: string; forecast?: string | null; previous?: string | null; actual?: string | null } | null;
}

const toView = (r: CalRow): CalendarEventView => ({
  title_ar: r.title,
  title_en: r.meta?.title_en ?? r.title,
  currency: r.currency,
  impact: r.impact,
  time: new Date(r.event_time),
  forecast: r.meta?.forecast ?? undefined,
  previous: r.meta?.previous ?? undefined,
});

async function eventsBetween(from: Date, to: Date): Promise<CalRow[]> {
  const { data, error } = await db()
    .from("news")
    .select("external_id, title, currency, impact, event_time, meta")
    .eq("kind", "calendar")
    .gte("event_time", from.toISOString())
    .lte("event_time", to.toISOString())
    .order("event_time");
  if (error) throw error;
  return (data ?? []) as CalRow[];
}

/** أجندة اليوم (أحداث اليوم بالتوقيت المحلي) */
export async function runAgenda(s: BotSettings, now = new Date()) {
  const tz = s.general.timezone;
  const today = dayKey(now, tz);
  const rows = (await eventsBetween(new Date(now.getTime() - 24 * 3600_000), new Date(now.getTime() + 36 * 3600_000))).filter(
    (r) => dayKey(new Date(r.event_time), tz) === today,
  );
  if (!rows.length) return { events: 0, outcome: "no_events" };
  const dateLabel = new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(now);
  const r = await intake(
    {
      kind: "agenda",
      title: `أجندة ${today}`,
      body: formatCalendarDigest(rows.map(toView), dateLabel, tz),
      format: "html",
      external_id: `agenda:${today}`,
      score: Math.max(...rows.map((x) => impactScore(x.impact))),
      policy: "agenda",
      skipRules: true,
    },
    s,
    now,
  );
  return { events: rows.length, outcome: r.outcome };
}

/** تنبيه قبل الخبر القوي بعدد دقائق، مع القراءة المعتادة للنتيجة */
export async function runEventAlerts(s: BotSettings, now = new Date()) {
  const rows = await eventsBetween(now, new Date(now.getTime() + s.calendar.pre_alert_min * 60_000));
  const outcomes: string[] = [];
  const fmt = new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: s.general.timezone });
  for (const r of rows) {
    const v = toView(r);
    const mins = Math.max(1, Math.round((v.time.getTime() - now.getTime()) / 60_000));
    const lines = [
      `⚠️ <b>بعد ${mins} دقيقة: ${escapeHtml(v.title_ar)}</b>`,
      `${escapeHtml(CURRENCY_LABEL[v.currency] ?? v.currency)} • ${IMPACT_ICON[v.impact]} ${IMPACT_LABEL[v.impact]} • ${fmt.format(v.time)}`,
    ];
    const fp = [v.forecast ? `المتوقع: ${escapeHtml(v.forecast)}` : "", v.previous ? `السابق: ${escapeHtml(v.previous)}` : ""].filter(Boolean).join(" | ");
    if (fp) lines.push(fp);
    if (s.calendar.explain) {
      const reading = eventReadingText(v.currency, v.title_en);
      if (reading) lines.push("", reading, "<i>تعليمي وليس توصية.</i>");
    }
    const res = await intake(
      {
        kind: "event_alert",
        title: v.title_ar,
        body: lines.join("\n"),
        format: "html",
        external_id: `alert:${r.external_id}`,
        score: impactScore(v.impact),
        policy: "agenda",
        breaking: v.impact === "high",
        skipRules: true,
      },
      s,
      now,
    );
    outcomes.push(res.outcome);
  }
  return { upcoming: rows.length, outcomes };
}

/** حجم المفاجأة: شكد بعيد الفعلي عن المتوقع */
export function surprise(actual: string, forecast?: string | null) {
  const a = numberOf(actual);
  const f = numberOf(forecast);
  if (a === null || f === null || a === f) return null;
  if (f === 0) return { higher: a > f, label: a > f ? "⬆️ أعلى من المتوقع" : "⬇️ أقل من المتوقع" };
  const pct = Math.abs((a - f) / f) * 100;
  const size = pct >= 25 ? " — 💥 مفاجأة كبيرة" : pct >= 10 ? " — ⚡ مفاجأة متوسطة" : "";
  return { higher: a > f, label: `${a > f ? "⬆️ أعلى" : "⬇️ أقل"} من المتوقع${size}` };
}

/**
 * نتيجة الخبر بعد صدوره (الفعلي مقابل المتوقع). يعمل فقط إذا كان المصدر يعطي الرقم الفعلي؛
 * بيانات ForexFactory المجانية قد لا تحتويه، فيبقى القسم ساكتاً.
 */
export async function runEventResults(s: BotSettings, now = new Date()) {
  const rows = (await eventsBetween(new Date(now.getTime() - 3 * 3600_000), now)).filter((r) => r.meta?.actual);
  const outcomes: string[] = [];
  for (const r of rows) {
    const v = toView(r);
    const actual = r.meta!.actual!;
    const cmp = surprise(actual, v.forecast);
    const lines = [
      `📢 <b>صدر الآن: ${escapeHtml(v.title_ar)}</b>`,
      `${escapeHtml(CURRENCY_LABEL[v.currency] ?? v.currency)} • ${IMPACT_ICON[v.impact]}`,
      [`الفعلي: <b>${escapeHtml(actual)}</b>`, v.forecast && `المتوقع: ${escapeHtml(v.forecast)}`, v.previous && `السابق: ${escapeHtml(v.previous)}`].filter(Boolean).join(" | "),
    ];
    if (cmp) lines.push(cmp.label);
    if (cmp && s.calendar.explain) {
      const reading = resultReadingText(v.currency, v.title_en, cmp.higher);
      if (reading) lines.push("", reading, "<i>تعليمي وليس توصية.</i>");
    }
    const res = await intake(
      { kind: "event_result", title: v.title_ar, body: lines.join("\n"), format: "html", external_id: `result:${r.external_id}`, score: impactScore(v.impact), policy: "agenda", breaking: true, skipRules: true },
      s,
      now,
    );
    outcomes.push(res.outcome);
  }
  return { with_actual: rows.length, outcomes };
}
