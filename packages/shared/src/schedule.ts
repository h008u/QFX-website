// أدوات الوقت: كل المواعيد بتوقيت المنطقة المختارة، والمهمة "مستحقة" إذا عدّى وقتها اليوم ولم تُنفّذ بعد.

export interface LocalParts {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  weekday: number; // 0 = الأحد
  minutes: number; // دقائق منذ منتصف الليل
}

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localParts(d: Date, timeZone: string): LocalParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const hh = parts.hour === "24" ? "00" : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hh}:${parts.minute}`,
    weekday: WD[parts.weekday] ?? 0,
    minutes: Number(hh) * 60 + Number(parts.minute),
  };
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const isValidTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/**
 * هل الموعد اليومي/الأسبوعي مستحق الآن؟
 * - مستحق إذا اليوم مطابق، والوقت المحلي عدّى الموعد، ولم يُنفّذ اليوم (lastRunDate)،
 *   وما فات على الموعد أكثر من graceMin (حتى لا ينشر تحية الصباح بالليل إذا الخدمة كانت نايمة).
 */
export function isSlotDue(opts: {
  now: Date;
  timeZone: string;
  time: string;
  days?: number[];
  lastRunDate?: string | null;
  graceMin?: number;
}): { due: boolean; date: string } {
  const p = localParts(opts.now, opts.timeZone);
  const at = toMinutes(opts.time);
  const grace = opts.graceMin ?? 180;
  const dayOk = !opts.days || opts.days.includes(p.weekday);
  const due = dayOk && p.minutes >= at && p.minutes - at <= grace && opts.lastRunDate !== p.date;
  return { due, date: p.date };
}

/** هل الوقت الحالي داخل ساعات الهدوء؟ (يدعم الفترة التي تعبر منتصف الليل) */
export function inQuietHours(now: Date, timeZone: string, start: string, end: string): boolean {
  const m = localParts(now, timeZone).minutes;
  const s = toMinutes(start);
  const e = toMinutes(end);
  return s === e ? false : s < e ? m >= s && m < e : m >= s || m < e;
}

/** أقرب وقت (UTC) تنتهي فيه ساعات الهدوء */
export function quietEndsAt(now: Date, timeZone: string, end: string): Date {
  const m = localParts(now, timeZone).minutes;
  let diff = toMinutes(end) - m;
  if (diff <= 0) diff += 24 * 60;
  return new Date(Math.floor(now.getTime() / 60000) * 60000 + diff * 60000);
}

export const WEEKDAY_LABEL = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
