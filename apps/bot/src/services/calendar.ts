import { formatCalendarDigest, type CalendarEventView, type Impact } from "@qfx/shared";
import { getEnv } from "../env";
import { db } from "../supabase";
import { postToChannel } from "../telegram";
import { translateEventTitle } from "./calendar-translate";

/** مصدر مجاني لمفكرة الأسبوع بصيغة JSON (بيانات ForexFactory) */
export const CALENDAR_FEED_URL =
  process.env.CALENDAR_FEED_URL || "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

export interface RawCalendarEvent {
  title: string;
  country: string; // رمز العملة مثل USD
  date: string; // ISO مع المنطقة الزمنية
  impact: string; // High | Medium | Low | Holiday
  forecast?: string;
  previous?: string;
}

export interface CalendarEvent extends CalendarEventView {
  external_id: string;
}

const IMPACT_MAP: Record<string, Impact | undefined> = { High: "high", Medium: "medium", Low: "low" };

/** يفلتر الأحداث حسب العملات ومستوى التأثير ويترجمها */
export function filterEvents(
  raw: RawCalendarEvent[],
  opts: { currencies: Set<string>; minImpact: "high" | "medium" },
): CalendarEvent[] {
  const allowed: Impact[] = opts.minImpact === "medium" ? ["high", "medium"] : ["high"];
  return raw
    .map((e) => ({ e, impact: IMPACT_MAP[e.impact], time: new Date(e.date) }))
    .filter(({ e, impact, time }) =>
      impact !== undefined &&
      allowed.includes(impact) &&
      opts.currencies.has(e.country.toUpperCase()) &&
      !Number.isNaN(time.getTime()),
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
    }))
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

/** مفتاح اليوم (YYYY-MM-DD) في منطقة زمنية معينة */
export function dayKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export async function fetchCalendar(): Promise<RawCalendarEvent[]> {
  const res = await fetch(CALENDAR_FEED_URL, { headers: { "User-Agent": "qfx-calendar-bot/1.0" } });
  if (!res.ok) throw new Error(`Calendar feed responded ${res.status}`);
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) throw new Error("Unexpected calendar feed format");
  return json as RawCalendarEvent[];
}

/**
 * مهمة دورية: تحفظ أحداث الأسبوع المهمة في جدول news (تظهر في الموقع)،
 * وتنشر ملخص اليوم في القناة مرة واحدة فقط (الأحداث غير المنشورة).
 */
export async function runCalendarJob(now = new Date()) {
  const env = getEnv();
  const events = filterEvents(await fetchCalendar(), {
    currencies: env.calendarCurrencies,
    minImpact: env.calendarMinImpact,
  });

  if (events.length) {
    const rows = events.map((e) => ({
      kind: "calendar" as const,
      title: e.title_ar,
      body: [
        e.title_ar.includes(e.title_en) ? null : e.title_en,
        e.forecast ? `المتوقع: ${e.forecast}` : null,
        e.previous ? `السابق: ${e.previous}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || null,
      impact: e.impact,
      currency: e.currency,
      event_time: e.time.toISOString(),
      source: "ForexFactory",
      external_id: e.external_id,
    }));
    // ignoreDuplicates: لا نعيد كتابة الأحداث الموجودة (نحافظ على حالة النشر)
    const { error } = await db().from("news").upsert(rows, { onConflict: "external_id", ignoreDuplicates: true });
    if (error) throw error;
  }

  const today = dayKey(now, env.calendarTimeZone);
  const todays = events.filter((e) => dayKey(e.time, env.calendarTimeZone) === today);
  if (!todays.length) return { stored: events.length, published: 0 };

  const { data: pending, error } = await db()
    .from("news")
    .select("id, external_id")
    .in("external_id", todays.map((e) => e.external_id))
    .eq("published_to_telegram", false);
  if (error) throw error;
  if (!pending?.length) return { stored: events.length, published: 0 };

  const pendingIds = new Set(pending.map((p) => p.external_id));
  const toPublish = todays.filter((e) => pendingIds.has(e.external_id));
  const dateLabel = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: env.calendarTimeZone,
  }).format(now);

  const messageId = await postToChannel(formatCalendarDigest(toPublish, dateLabel, env.calendarTimeZone));
  await db()
    .from("news")
    .update({ published_to_telegram: true, telegram_message_id: messageId })
    .in("id", pending.map((p) => p.id));

  return { stored: events.length, published: toPublish.length };
}
