// يولّد أيقونات التطبيق (PWA) من شعار QFX: node scripts/gen-icons.mjs
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const NAVY = "#0A1D42";
const GOLD = "#C9A13F";
// الشعار نفسه في site-header.tsx (مربع كحلي وخط صاعد ذهبي)، مكبّر إلى 512
const mark = (pad) => {
  const s = (512 - pad * 2) / 34;
  const p = (x, y) => `${(pad + x * s).toFixed(1)} ${(pad + y * s).toFixed(1)}`;
  return `<path d="M${p(8, 22.5)} L${p(14, 15.5)} L${p(18.5, 19.5)} L${p(26, 10.5)}" fill="none" stroke="${GOLD}" stroke-width="${(3 * s).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${(pad + 26 * s).toFixed(1)}" cy="${(pad + 10.5 * s).toFixed(1)}" r="${(2.4 * s).toFixed(1)}" fill="${GOLD}"/>`;
};
const icon = (rounded) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="${NAVY}"/>${mark(rounded ? 0 : 72)}</svg>`;

const out = "apps/web/public";
writeFileSync(`${out}/icon.svg`, icon(true));
const png = (svg, size, file) => writeFileSync(`${out}/${file}`, new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng());
png(icon(true), 192, "icon-192.png");
png(icon(true), 512, "icon-512.png");
png(icon(false), 512, "icon-maskable-512.png"); // مساحة آمنة للأيقونات المقصوصة (أندرويد)
png(icon(false), 180, "apple-touch-icon.png"); // iOS يضيف الحواف المدورة بنفسه
console.log("icons written to", out);
