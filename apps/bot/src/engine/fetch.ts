/** fetch بمهلة زمنية */
export async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 15_000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; QFXBot/1.0)", ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

export const stripHtml = (s: string) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

export const isArabic = (s: string) => /[؀-ۿ]/.test(s);

/** ترجمة مجانية (واجهة Google غير الرسمية — نفس طريقة Spir). عند الفشل يرجع النص الأصلي */
export async function translate(text: string, lang = "ar"): Promise<string> {
  if (!text?.trim() || (lang === "ar" && isArabic(text))) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text.slice(0, 1800))}`;
    const res = await fetchWithTimeout(url, {}, 10_000);
    if (!res.ok) return text;
    const data = (await res.json()) as [[string][]];
    return data[0].map((p) => p[0]).join("") || text;
  } catch {
    return text;
  }
}
