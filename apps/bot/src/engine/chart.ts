// صور الشارت بدون متصفح: نرسم SVG ونحوّله PNG بمكتبة resvg (تعمل على الخطة المجانية)
import { computeRows, priceDecimals, type Bar } from "@qfx/shared";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";

const require = createRequire(import.meta.url);
const FONTS = ["DejaVuSans.ttf", "DejaVuSans-Bold.ttf", "DejaVuSansMono.ttf"].map((f) => {
  try {
    return require.resolve(`dejavu-fonts-ttf/ttf/${f}`);
  } catch {
    return null;
  }
}).filter(Boolean) as string[];

export interface ChartLine {
  price: number;
  label: string;
  kind: "entry" | "sl" | "tp";
}

const C = { bg: "#FFFFFF", grid: "#EEF0F3", text: "#52525B", up: "#059669", down: "#E2362B", ema20: "#2563EB", ema50: "#F59E0B", entry: "#27272A", brand: "#059669" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** يرسم آخر الشموع مع المتوسطين ومستويات الإشارة */
export function chartSvg(opts: { symbol: string; tfLabel: string; bars: Bar[]; lines?: ChartLine[]; width?: number; height?: number; count?: number }): string {
  const W = opts.width ?? 1000;
  const H = opts.height ?? 560;
  const rowsAll = computeRows(opts.bars);
  const n = Math.min(opts.count ?? 90, rowsAll.length);
  const rows = rowsAll.slice(-n);
  const pad = { l: 16, r: 92, t: 56, b: 36 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  const levels = (opts.lines ?? []).map((l) => l.price);
  let lo = Math.min(...rows.map((r) => r.low), ...levels);
  let hi = Math.max(...rows.map((r) => r.high), ...levels);
  const m = (hi - lo) * 0.06 || hi * 0.001;
  lo -= m;
  hi += m;
  const y = (p: number) => pad.t + ((hi - p) / (hi - lo)) * ph;
  const step = pw / n;
  const x = (i: number) => pad.l + step * i + step / 2;
  const d = priceDecimals(rows.at(-1)!.close);
  const parts: string[] = [];

  parts.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);
  // الشبكة ومحور الأسعار
  for (let g = 0; g <= 6; g++) {
    const p = lo + ((hi - lo) * g) / 6;
    parts.push(`<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(p).toFixed(1)}" y2="${y(p).toFixed(1)}" stroke="${C.grid}"/>`);
    parts.push(`<text x="${W - pad.r + 8}" y="${(y(p) + 4).toFixed(1)}" font-family="DejaVu Sans Mono" font-size="13" fill="${C.text}">${p.toFixed(d)}</text>`);
  }
  // الشموع
  const bw = Math.max(2, step * 0.62);
  rows.forEach((r, i) => {
    const col = r.close >= r.open ? C.up : C.down;
    const top = y(Math.max(r.open, r.close));
    const bh = Math.max(1, Math.abs(y(r.open) - y(r.close)));
    parts.push(`<line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${y(r.high).toFixed(1)}" y2="${y(r.low).toFixed(1)}" stroke="${col}" stroke-width="1.2"/>`);
    parts.push(`<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${col}"/>`);
  });
  // المتوسطات
  for (const [key, color] of [["EMA20", C.ema20], ["EMA50", C.ema50]] as const) {
    const pts = rows.map((r, i) => (r[key] ? `${x(i).toFixed(1)},${y(r[key] as number).toFixed(1)}` : null)).filter(Boolean);
    if (pts.length > 1) parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="1.6" opacity="0.85"/>`);
  }
  // مستويات الإشارة
  for (const l of opts.lines ?? []) {
    const col = l.kind === "tp" ? C.up : l.kind === "sl" ? C.down : C.entry;
    const yy = y(l.price).toFixed(1);
    parts.push(`<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" stroke="${col}" stroke-width="1.4" ${l.kind === "entry" ? "" : 'stroke-dasharray="6 4"'}/>`);
    parts.push(`<rect x="${W - pad.r + 2}" y="${(+yy - 10).toFixed(1)}" width="${pad.r - 4}" height="20" rx="3" fill="${col}"/>`);
    parts.push(`<text x="${W - pad.r + 8}" y="${(+yy + 4.5).toFixed(1)}" font-family="DejaVu Sans Mono" font-size="12.5" font-weight="bold" fill="#FFFFFF">${l.price.toFixed(d)}</text>`);
    parts.push(`<text x="${pad.l + 6}" y="${(+yy - 5).toFixed(1)}" font-family="DejaVu Sans" font-size="12" font-weight="bold" fill="${col}">${esc(l.label)}</text>`);
  }
  // العنوان
  const last = rows.at(-1)!;
  const chg = ((last.close - rows[0].close) / rows[0].close) * 100;
  parts.push(`<text x="${pad.l}" y="34" font-family="DejaVu Sans" font-size="24" font-weight="bold" fill="#09090B">${esc(opts.symbol)}</text>`);
  parts.push(`<text x="${pad.l + 17.5 * opts.symbol.length + 18}" y="34" font-family="DejaVu Sans" font-size="16" fill="${C.text}">${esc(opts.tfLabel)}  ·  ${last.close.toFixed(d)}  <tspan fill="${chg >= 0 ? C.up : C.down}">${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%</tspan></text>`);
  parts.push(`<text x="${W - pad.r - 4}" y="34" text-anchor="end" font-family="DejaVu Sans" font-size="15" font-weight="bold" fill="${C.brand}">QFX</text>`);
  parts.push(`<text x="${pad.l}" y="${H - 12}" font-family="DejaVu Sans" font-size="12" fill="${C.ema20}">EMA20</text><text x="${pad.l + 60}" y="${H - 12}" font-family="DejaVu Sans" font-size="12" fill="${C.ema50}">EMA50</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}

export function renderChartPng(opts: Parameters<typeof chartSvg>[0]): Buffer {
  const svg = chartSvg(opts);
  const r = new Resvg(svg, { font: { fontFiles: FONTS, loadSystemFonts: FONTS.length === 0, defaultFontFamily: "DejaVu Sans" }, background: C.bg });
  return r.render().asPng();
}
