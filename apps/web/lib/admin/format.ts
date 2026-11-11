export const fmtDateTime = (iso: string | null | undefined, tz = "Asia/Riyadh") =>
  iso
    ? new Intl.DateTimeFormat("ar-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(new Date(iso))
    : "—";

export const fmtTime = (iso: string, tz = "Asia/Riyadh") =>
  new Intl.DateTimeFormat("ar-u-nu-latn", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(new Date(iso));

/** قيمة datetime-local بتوقيت معيّن */
export function toLocalInput(iso: string | null, tz: string): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3600_000);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** يحوّل قيمة datetime-local (بتوقيت المنطقة) إلى ISO */
export function fromLocalInput(value: string, tz: string): string {
  const asUtc = new Date(`${value}:00Z`);
  // فرق المنطقة الزمنية في ذلك اليوم
  const local = new Date(asUtc.toLocaleString("en-US", { timeZone: tz }));
  const utc = new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(asUtc.getTime() - (local.getTime() - utc.getTime())).toISOString();
}
