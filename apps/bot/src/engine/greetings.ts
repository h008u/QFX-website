import { isSlotDue, localParts, type BotSettings } from "@qfx/shared";
import { getState, setState } from "./config";
import { intake } from "./intake";

export type GreetingType = "morning" | "open" | "close";
export const GREETING_LABEL: Record<GreetingType, string> = { morning: "التحية الصباحية", open: "افتتاح الأسواق", close: "إغلاق الأسواق" };

interface GreetState {
  last_caption: Partial<Record<GreetingType, string>>;
  last_date: Partial<Record<GreetingType, string>>;
}

/** يختار نصاً عشوائياً لا يكرر النص السابق */
export function pickCaption(list: string[], last?: string): string {
  const choices = list.length > 1 ? list.filter((c) => c !== last) : list;
  return choices[Math.floor(Math.random() * choices.length)] ?? "";
}

export function holidayOf(s: BotSettings, now: Date) {
  const md = localParts(now, s.general.timezone).date.slice(5);
  return s.holidays.find((h) => h.date === md) ?? null;
}

/** ينشر تحية (الصباح/الافتتاح/الإغلاق). force = تجربة فورية من اللوحة */
export async function postGreeting(type: GreetingType, s: BotSettings, now = new Date(), force = false) {
  const st = await getState<GreetState>("greetings", { last_caption: {}, last_date: {} });
  const holiday = holidayOf(s, now);
  if (holiday && type === "close" && !force) return { skipped: `عطلة: ${holiday.name}` };
  let caption = pickCaption(s.greetings.captions[type], st.last_caption[type]);
  if (holiday && type === "morning") caption += `\n\n🏖 اليوم عطلة (${holiday.name}) — السيولة ضعيفة والسوق قد يكون مغلقاً.`;
  if (holiday && type === "open") caption = `🏖 بمناسبة ${holiday.name} لا يفتتح السوق في موعده المعتاد.`;
  const images = s.greetings.images[type];
  const photo = images.length ? images[Math.floor(Math.random() * images.length)] : null;
  const date = localParts(now, s.general.timezone).date;
  const r = await intake(
    {
      kind: "greeting",
      title: GREETING_LABEL[type],
      body: caption,
      photo_url: photo,
      external_id: force ? null : `greeting:${type}:${date}`,
      policy: null,
      skipRules: true,
    },
    s,
    now,
  );
  st.last_caption[type] = caption;
  if (!force) st.last_date[type] = date;
  await setState("greetings", st);
  return { outcome: r.outcome };
}

/** يفحص مواعيد التحيات الثلاث وينشر المستحق منها */
export async function runGreetings(s: BotSettings, now = new Date()) {
  const st = await getState<GreetState>("greetings", { last_caption: {}, last_date: {} });
  const tz = s.general.timezone;
  const g = s.greetings;
  const slots: { type: GreetingType; enabled: boolean; time: string; days?: number[] }[] = [
    { type: "morning", enabled: g.morning.enabled, time: g.morning.time, days: g.morning.weekdays_only ? [1, 2, 3, 4, 5] : undefined },
    { type: "open", enabled: g.open.enabled, time: g.open.time, days: [g.open.day] },
    { type: "close", enabled: g.close.enabled, time: g.close.time, days: [g.close.day] },
  ];
  const done: Record<string, unknown> = {};
  for (const slot of slots) {
    if (!slot.enabled) continue;
    const { due } = isSlotDue({ now, timeZone: tz, time: slot.time, days: slot.days, lastRunDate: st.last_date[slot.type] });
    if (due) done[slot.type] = await postGreeting(slot.type, s, now);
  }
  return done;
}
