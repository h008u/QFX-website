/**
 * يولّد خطوط الموقع المستضافة ذاتياً (بدل جلبها من Google أثناء البناء — كان يفشل أحياناً).
 * الاستخدام: npm i --prefix /tmp/fonts @fontsource/<...> ثم
 *   node scripts/gen-fonts.mjs /tmp/fonts/node_modules/@fontsource
 * ينسخ woff2 للأوزان والمجموعات المطلوبة فقط إلى apps/web/public/fonts ويكتب apps/web/app/fonts.css
 */
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2];
if (!SRC) throw new Error("usage: node scripts/gen-fonts.mjs <path-to-@fontsource>");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT_DIR = path.join(ROOT, "apps/web/public/fonts");
const CSS_OUT = path.join(ROOT, "apps/web/app/fonts.css");

// [المتغير, الحزمة, اسم العائلة لدينا, الأوزان, المجموعات]
export const FONTS = [
  ["plex", "ibm-plex-sans-arabic", "QFX Plex Arabic", [400, 500, 600, 700], ["arabic"]],
  ["kufi", "noto-kufi-arabic", "QFX Kufi", [600, 700, 800], ["arabic"]],
  ["plexmono", "ibm-plex-mono", "QFX Plex Mono", [400, 500, 600], ["latin"]],
  ["jet", "jetbrains-mono", "QFX JetBrains Mono", [400, 500, 700], ["latin"]],
  ["readex", "readex-pro", "QFX Readex", [300, 400, 600, 700], ["arabic", "latin"]],
  ["grotesk", "space-grotesk", "QFX Grotesk", [500, 700], ["latin"]],
  ["messiri", "el-messiri", "QFX Messiri", [500, 600, 700], ["arabic", "latin"]],
  ["tajawal", "tajawal", "QFX Tajawal", [400, 500, 700], ["arabic", "latin"]],
  ["cormorant", "cormorant-garamond", "QFX Cormorant", [500, 600, 700], ["latin"]],
  ["inter", "inter", "QFX Inter", [400, 500, 600, 700], ["latin"]],
];

fs.rmSync(OUT_DIR, { recursive: true, force: true });
let css = "/* مُولّد آلياً من scripts/gen-fonts.mjs — خطوط مستضافة ذاتياً (Fontsource, OFL) */\n\n";
const vars = [];
let bytes = 0;
for (const [v, pkg, family, weights, subsets] of FONTS) {
  const dir = path.join(SRC, pkg);
  fs.mkdirSync(path.join(OUT_DIR, pkg), { recursive: true });
  for (const w of weights) {
    const src = fs.readFileSync(path.join(dir, `${w}.css`), "utf8");
    for (const block of src.split("@font-face").slice(1)) {
      const subset = block.match(/\/\*\s*[\w-]+?-([a-z-]+)-\d+-normal\s*\*\//)?.[1] ?? block.match(/files\/[\w-]+?-((?:arabic|latin|latin-ext|cyrillic-ext|cyrillic|greek|vietnamese))-\d+-normal\.woff2/)?.[1];
      const file = block.match(/url\(\.\/files\/([^)]+\.woff2)\)/)?.[1];
      const range = block.match(/unicode-range:\s*([^;]+);/)?.[1];
      if (!file || !subsets.some((s) => file.includes(`-${s}-${w}-normal`))) continue;
      void subset;
      fs.copyFileSync(path.join(dir, "files", file), path.join(OUT_DIR, pkg, file));
      bytes += fs.statSync(path.join(OUT_DIR, pkg, file)).size;
      css += `@font-face {\n  font-family: "${family}";\n  font-style: normal;\n  font-display: swap;\n  font-weight: ${w};\n  src: url(/fonts/${pkg}/${file}) format("woff2");\n${range ? `  unicode-range: ${range};\n` : ""}}\n`;
    }
  }
  vars.push(`  --f-${v}: "${family}";`);
}
css += `\n:root {\n${vars.join("\n")}\n}\n`;
fs.writeFileSync(CSS_OUT, css);
console.log(`fonts: ${(bytes / 1024).toFixed(0)} KB → ${path.relative(ROOT, OUT_DIR)}; css → ${path.relative(ROOT, CSS_OUT)}`);
