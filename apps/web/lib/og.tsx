/**
 * أدوات صور المشاركة (next/og / Satori) — منقولة ومكيّفة من fx-partners.
 *
 * 1) الخط: next/og بلا حروف عربية، فنطلب من Google Fonts مجموعة جزئية بالحروف المستخدمة فقط
 *    (بـ User-Agent قديم حتى يرسل TrueType/woff بدل woff2 الذي لا يقرؤه Satori). أي فشل ← بطاقة SVG بديلة.
 * 2) الاتجاه: Satori يشكّل الكلمة العربية صحيحاً لكنه يرصّ الكلمات من اليسار لليمين،
 *    فنعكس ترتيب الكلمات لكل سطر ونكسر الأسطر بأنفسنا.
 */
import { reshapeArabic } from "./arabic-reshape";

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function hasArabic(text: string) {
  return ARABIC.test(text);
}

/** الكلمات بترتيب القراءة، والكلمات غير العربية المتتالية تبقى مجموعة واحدة */
export function rtlRuns(text: string): string[] {
  const runs: string[] = [];
  let latin: string[] = [];
  for (const w of text.trim().split(/\s+/).filter(Boolean)) {
    if (ARABIC.test(w)) {
      if (latin.length) runs.push(latin.join(" "));
      latin = [];
      runs.push(w);
    } else latin.push(w);
  }
  if (latin.length) runs.push(latin.join(" "));
  return runs;
}

/** كلمة عربية بترتيب بصري: أشكال الحروف السياقية ثم عكس الأحرف (Satori يرصّها من اليسار لليمين) */
function visualWord(run: string): string {
  return ARABIC.test(run) ? [...reshapeArabic(run)].reverse().join("") : run;
}

export function rtlLines(text: string, maxChars = Infinity): string[] {
  const lines: string[][] = [];
  let line: string[] = [];
  let len = 0;
  for (const run of rtlRuns(text)) {
    if (line.length && len + 1 + run.length > maxChars) {
      lines.push(line);
      line = [];
      len = 0;
    }
    line.push(run);
    len += (line.length > 1 ? 1 : 0) + run.length;
  }
  if (line.length) lines.push(line);
  return lines.map((l) => [...l].reverse().map(visualWord).join(" "));
}

type Style = Record<string, string | number>;

export function RtlText({ text, style, maxChars }: { text: string; style: Style; maxChars?: number }) {
  if (!hasArabic(text)) return <span style={{ display: "flex", ...style }}>{text}</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", ...style }}>
      {rtlLines(text, maxChars).map((l, i) => (
        <span key={i} style={{ display: "flex" }}>
          {l}
        </span>
      ))}
    </div>
  );
}

export async function loadArabicFont(text: string, weight: 400 | 700 = 700) {
  try {
    const family = "IBM Plex Sans Arabic";
    const subset = `${text} ${reshapeArabic(text)} QFX ·•—–-.,:;/%$+()0123456789 `;
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(subset)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.30 (KHTML, like Gecko) Version/5.0 Safari/534.30" },
        signal: AbortSignal.timeout(2500),
      })
    ).text();
    const m = css.match(/src:\s*url\((https:[^)]+)\)\s*format\('(?:truetype|woff|opentype)'\)/);
    if (!m) return [];
    const data = await (await fetch(m[1], { signal: AbortSignal.timeout(2500) })).arrayBuffer();
    return [{ name: "Plex", data, weight, style: "normal" as const }];
  } catch {
    return [];
  }
}

export const OG_HEADERS = { "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" };

/** بطاقة SVG بلا خطوط عند تعذّر تحميل الخط */
export function fallbackCard(w = 1200, h = 630): Response {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="100%" height="100%" fill="#0A1F44"/>` +
    `<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="120" fill="#ffffff">QFX</text></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=300" } });
}
