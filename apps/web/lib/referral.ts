/** كوكي تتبّع الإحالة: يُضبط عند زيارة أي صفحة بـ ?ref=CODE ويبقى 30 يوماً */
export const REF_COOKIE = "qfx_ref";
export const REF_MAX_AGE = 60 * 60 * 24 * 30;

export function sanitizeRef(value: string | null | undefined): string | null {
  const v = value?.trim().slice(0, 32) ?? "";
  return /^[A-Za-z0-9_-]{2,32}$/.test(v) ? v : null;
}
