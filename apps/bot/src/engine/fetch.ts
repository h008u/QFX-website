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

const unescapeHtml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** ترجمة منشور HTML بدون ما تخرب الوسوم: كل نص بين الوسوم يُترجم وحده (منقول من Spir) */
export async function translateHtml(html: string, lang: string): Promise<string> {
  const parts = String(html).split(/(<[^>]+>)/);
  const out = await Promise.all(
    parts.map(async (p) => {
      if (p.startsWith("<") || !/\p{L}/u.test(p)) return p;
      const lead = p.match(/^\s*/)?.[0] ?? "";
      const tail = p.match(/\s*$/)?.[0] ?? "";
      const t = await translateTo(unescapeHtml(p.trim()), lang);
      return lead + escapeText(t) + tail;
    }),
  );
  return out.join("");
}

/** ترجمة إلى أي لغة (بدون شرط "النص ليس عربياً") */
export async function translateTo(text: string, lang: string): Promise<string> {
  if (!text?.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text.slice(0, 1800))}`;
    const res = await fetchWithTimeout(url, {}, 10_000);
    if (!res.ok) return text;
    const data = (await res.json()) as [[string][]];
    return data[0].map((p) => p[0]).join("") || text;
  } catch {
    return text;
  }
}

/** رقم من نص مثل 3.2% أو 210K أو -0.5 */
export function numberOf(v: unknown): number | null {
  const m = String(v ?? "").replace(/,/g, "").match(/^\s*([-+]?\d*\.?\d+)\s*([KMBT%])?/i);
  if (!m) return null;
  const mult = ({ K: 1e3, M: 1e6, B: 1e9, T: 1e12 } as Record<string, number>)[(m[2] || "").toUpperCase()] || 1;
  return Number(m[1]) * mult;
}
