/**
 * QFX → Figma
 * يبني ثلاث صفحات في ملف Figma الحالي:
 *   QFX · Foundations  — متغيرات الألوان (فاتح/داكن) + أنماط الخطوط + لوحات العرض
 *   QFX · Components   — شعارات الرموز، الأزرار، شارة التغير، الفلاتر، صفوف المراقبة، الشريط السفلي، رأس الجوال، الإحصائية
 *   QFX · Screens      — شاشات الجوال والكمبيوتر (فاتح + داكن) مبنية من المكونات والمتغيرات
 * إعادة التشغيل آمنة: يحذف صفحات/متغيرات/أنماط QFX السابقة فقط ويبنيها من جديد، ولا يلمس أي شيء آخر.
 */

const PAGE_NAMES = ["QFX · Foundations", "QFX · Components", "QFX · Screens"];

// ------------------------------------------------------------------ بيانات
const MARKETS = [
  { s: "XAUUSD", n: "الذهب مقابل الدولار", en: "Gold Spot / U.S. Dollar", c: "المعادن", p: 2656.63, ch: 20.36, pct: 0.77, d: 2, vol: 0.0022 },
  { s: "XAGUSD", n: "الفضة مقابل الدولار", en: "Silver / U.S. Dollar", c: "المعادن", p: 30.705, ch: -0.179, pct: -0.58, d: 3, vol: 0.004 },
  { s: "EURUSD", n: "اليورو مقابل الدولار", en: "Euro / U.S. Dollar", c: "العملات", p: 1.13261, ch: 0.00317, pct: 0.28, d: 5, vol: 0.0009 },
  { s: "GBPUSD", n: "الإسترليني مقابل الدولار", en: "British Pound / U.S. Dollar", c: "العملات", p: 1.25895, ch: 0.00476, pct: 0.38, d: 5, vol: 0.001 },
  { s: "USDJPY", n: "الدولار مقابل الين", en: "U.S. Dollar / Japanese Yen", c: "العملات", p: 147.367, ch: -0.147, pct: -0.1, d: 3, vol: 0.0012 },
  { s: "USDCHF", n: "الدولار مقابل الفرنك", en: "U.S. Dollar / Swiss Franc", c: "العملات", p: 0.85543, ch: -0.00094, pct: -0.11, d: 5, vol: 0.001 },
  { s: "AUDUSD", n: "الأسترالي مقابل الدولار", en: "Australian Dollar / U.S. Dollar", c: "العملات", p: 0.66989, ch: -0.00398, pct: -0.59, d: 5, vol: 0.0012 },
  { s: "USDCAD", n: "الدولار مقابل الكندي", en: "U.S. Dollar / Canadian Dollar", c: "العملات", p: 1.35488, ch: 0.00392, pct: 0.29, d: 5, vol: 0.0009 },
  { s: "WTI", n: "النفط الخام", en: "Crude Oil WTI", c: "الطاقة", p: 69.85, ch: -0.71, pct: -1.0, d: 2, vol: 0.005 },
  { s: "BTCUSD", n: "بيتكوين مقابل الدولار", en: "Bitcoin / U.S. Dollar", c: "الكريبتو", p: 92149.3, ch: 504.3, pct: 0.55, d: 1, vol: 0.006 },
  { s: "ETHUSD", n: "إيثريوم مقابل الدولار", en: "Ethereum / U.S. Dollar", c: "الكريبتو", p: 2991.12, ch: 8.65, pct: 0.29, d: 2, vol: 0.008 },
];
const M = Object.fromEntries(MARKETS.map((m) => [m.s, m]));

// [name, css, light, dark, scopes]
const ALL = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
const TOKENS = [
  ["bg", "hsl(var(--background))", "#FFFFFF", "#0F0F0F", ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR"]],
  ["fg", "hsl(var(--foreground))", "#131722", "#D1D4DC", ALL],
  ["muted", "hsl(var(--muted-foreground))", "#787B86", "#868993", ["TEXT_FILL", "SHAPE_FILL", "STROKE_COLOR"]],
  ["secondary", "hsl(var(--secondary))", "#F0F3FA", "#2A2E39", ["FRAME_FILL", "SHAPE_FILL"]],
  ["surface", "hsl(var(--surface))", "#F8F9FD", "#1E222D", ["FRAME_FILL", "SHAPE_FILL"]],
  ["card", "hsl(var(--card))", "#FFFFFF", "#131722", ["FRAME_FILL", "SHAPE_FILL"]],
  ["border", "hsl(var(--border))", "#E0E3EB", "#2A2E39", ["STROKE_COLOR", "FRAME_FILL", "SHAPE_FILL"]],
  ["input", "hsl(var(--input))", "#D1D4DC", "#363A45", ["STROKE_COLOR", "FRAME_FILL", "SHAPE_FILL"]],
  ["primary", "hsl(var(--primary))", "#2962FF", "#2962FF", ALL],
  ["primary-soft", "hsl(var(--primary) / 0.1)", "#2962FF1A", "#2962FF33", ["FRAME_FILL", "SHAPE_FILL"]],
  ["on-primary", "hsl(var(--primary-foreground))", "#FFFFFF", "#FFFFFF", ["TEXT_FILL", "SHAPE_FILL"]],
  ["up", "hsl(var(--success))", "#089981", "#089981", ALL],
  ["down", "hsl(var(--destructive))", "#F23645", "#F23645", ALL],
];

const ICONS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  candles: '<path d="M9 5v4"/><rect width="4" height="6" x="7" y="9" rx="1"/><path d="M9 15v2"/><path d="M17 3v2"/><rect width="4" height="8" x="15" y="5" rx="1"/><path d="M17 13v3"/><path d="M3 3v18h18"/>',
  bars: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  line: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  chevron: '<path d="m15 18-6-6 6-6"/>',
  expand: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>',
};

const CUR = {
  USD: ["#1F6F43", "$"], EUR: ["#1E40AF", "€"], GBP: ["#9F1239", "£"], JPY: ["#DC2626", "¥"],
  CHF: ["#E11D48", "Fr"], AUD: ["#0E7490", "A$"], CAD: ["#B91C1C", "C$"],
  XAU: ["#E2B33C", "Au", "#5C4300"], XAG: ["#B8BEC8", "Ag", "#2B3036"],
  BTC: ["#F7931A", "₿"], ETH: ["#627EEA", "Ξ"], WTI: ["#18181B", "OIL"],
};

const RATING = {
  strong_sell: ["بيع قوي", "down"], sell: ["بيع", "down"], neutral: ["محايد", "muted"],
  buy: ["شراء", "primary"], strong_buy: ["شراء قوي", "primary"],
};

// ------------------------------------------------------------------ أدوات عامة
function fmt(v, d) {
  const s = Math.abs(v).toFixed(d);
  const parts = s.split(".");
  const i = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (v < 0 ? "-" : "") + i + (parts[1] ? "." + parts[1] : "");
}
const pctTxt = (p) => (p >= 0 ? "+" : "") + p.toFixed(2) + "%";
function hexA(h) {
  h = h.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
}
function rgb(h) { const c = hexA(h); return { r: c.r, g: c.g, b: c.b }; }
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

async function main() {
  // ---------------------------------------------------------------- الخطوط
  const avail = await figma.listAvailableFontsAsync();
  const FAM = {};
  for (const f of avail) {
    if (!FAM[f.fontName.family]) FAM[f.fontName.family] = new Set();
    FAM[f.fontName.family].add(f.fontName.style);
  }
  const pick = (list) => list.find((f) => FAM[f]);
  const AR = pick(["IBM Plex Sans Arabic", "Noto Sans Arabic", "Noto Sans Arabic UI", "Cairo", "Tajawal", "Almarai", "Rubik", "Inter"]);
  const LA = pick(["Roboto", "Inter", "Arial"]) || AR;
  const WS = {
    400: ["Regular", "Normal", "Book"],
    500: ["Medium", "Regular"],
    600: ["SemiBold", "Semi Bold", "Semibold", "Medium", "Bold"],
    700: ["Bold", "SemiBold", "Semi Bold"],
  };
  const FN = (fam, w) => ({ family: fam, style: WS[w].find((s) => FAM[fam].has(s)) || Array.from(FAM[fam])[0] });
  for (const fam of [AR, LA]) for (const w of [400, 500, 600, 700]) await figma.loadFontAsync(FN(fam, w));

  // ---------------------------------------------------------------- الصفحات (إنشاء الجديد ثم حذف القديم)
  const old = figma.root.children.filter((p) => PAGE_NAMES.includes(p.name));
  const mkPage = (name) => { const p = figma.createPage(); p.name = name; return p; };
  const pgFound = mkPage(PAGE_NAMES[0]);
  const pgComps = mkPage(PAGE_NAMES[1]);
  const pgScreens = mkPage(PAGE_NAMES[2]);
  await figma.setCurrentPageAsync(pgFound);
  for (const p of old) p.remove();
  for (const c of await figma.variables.getLocalVariableCollectionsAsync()) if (c.name === "QFX Color") c.remove();
  for (const s of await figma.getLocalTextStylesAsync()) if (s.name.indexOf("QFX/") === 0) s.remove();

  // ---------------------------------------------------------------- المتغيرات
  const coll = figma.variables.createVariableCollection("QFX Color");
  const LIGHT = coll.modes[0].modeId;
  coll.renameMode(LIGHT, "Light");
  const DARK = coll.addMode("Dark");
  const V = {};
  for (const [name, css, l, d, scopes] of TOKENS) {
    const v = figma.variables.createVariable("color/" + name, coll, "COLOR");
    v.setValueForMode(LIGHT, hexA(l));
    v.setValueForMode(DARK, hexA(d));
    v.scopes = scopes;
    v.setVariableCodeSyntax("WEB", css);
    V[name] = v;
  }
  const P = (n) => figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V[n]);
  const raw = (h, o) => ({ type: "SOLID", color: rgb(h), opacity: o == null ? 1 : o });
  const paint = (c) => (c[0] === "#" ? raw(c) : P(c));
  const fill = (n, c) => { n.fills = c ? [paint(c)] : []; };
  const setDark = (node) => node.setExplicitVariableModeForCollection(coll, DARK);
  function side(n, which, c, w) {
    n.strokes = [paint(c || "border")];
    n.strokeAlign = "INSIDE";
    n.strokeTopWeight = which === "top" ? w || 1 : 0;
    n.strokeBottomWeight = which === "bottom" ? w || 1 : 0;
    n.strokeLeftWeight = which === "left" ? w || 1 : 0;
    n.strokeRightWeight = which === "right" ? w || 1 : 0;
  }
  function box(n, c) { n.strokes = [paint(c || "border")]; n.strokeWeight = 1; n.strokeAlign = "INSIDE"; }

  // ---------------------------------------------------------------- أنماط الخطوط
  const STY = {
    Hero: [AR, 700, 72, 84], Display: [AR, 700, 44, 52], H1: [AR, 700, 32, 40], H2: [AR, 700, 24, 32],
    Title: [AR, 700, 17, 26], Body: [AR, 400, 15, 24], BodyB: [AR, 600, 15, 24],
    Small: [AR, 400, 13, 20], SmallB: [AR, 600, 13, 20], Caption: [AR, 500, 11, 16],
    NumXL: [LA, 700, 44, 48], NumL: [LA, 700, 28, 32], NumM: [LA, 600, 16, 20], NumB: [LA, 600, 13, 16], Num: [LA, 400, 13, 16],
  };
  const TS = {};
  for (const k of Object.keys(STY)) {
    const [fam, w, size, lh] = STY[k];
    const s = figma.createTextStyle();
    s.name = "QFX/" + k;
    s.fontName = FN(fam, w);
    s.fontSize = size;
    s.lineHeight = { unit: "PIXELS", value: lh };
    TS[k] = s;
  }

  async function T(chars, st, color, o) {
    st = st || "Body"; o = o || {};
    const [fam, w, size, lh] = STY[st];
    const t = figma.createText();
    t.fontName = FN(fam, w);
    t.characters = String(chars);
    t.fontSize = size;
    t.lineHeight = { unit: "PIXELS", value: lh };
    await t.setTextStyleIdAsync(TS[st].id);
    fill(t, color || "fg");
    t.name = o.name || String(chars).slice(0, 40);
    if (/[؀-ۿ]/.test(chars)) t.textAlignHorizontal = "RIGHT";
    if (o.align) t.textAlignHorizontal = o.align;
    if (o.w) { t.resize(o.w, t.height); t.textAutoResize = "HEIGHT"; }
    return t;
  }

  // auto-layout: dir "H" | "V"; o: {name, gap, pad:[v,h]|[t,r,b,l], align, justify, fill, r, w, h}
  function AL(dir, o) {
    o = o || {};
    const f = figma.createFrame();
    f.name = o.name || (dir === "H" ? "Row" : "Stack");
    f.layoutMode = dir === "H" ? "HORIZONTAL" : "VERTICAL";
    f.fills = [];
    f.clipsContent = false;
    f.itemSpacing = o.gap || 0;
    const p = o.pad || [0, 0];
    const q = p.length === 2 ? [p[0], p[1], p[0], p[1]] : p;
    f.paddingTop = q[0]; f.paddingRight = q[1]; f.paddingBottom = q[2]; f.paddingLeft = q[3];
    f.counterAxisAlignItems = o.align || (dir === "H" ? "CENTER" : "MAX");
    f.primaryAxisAlignItems = o.justify || (dir === "H" ? "MIN" : "MIN");
    if (o.fill) fill(f, o.fill);
    if (o.r != null) f.cornerRadius = o.r;
    if (o.w || o.h) f.resize(o.w || 10, o.h || 10);
    const horiz = f.layoutMode === "HORIZONTAL";
    if (horiz) { f.primaryAxisSizingMode = o.w ? "FIXED" : "AUTO"; f.counterAxisSizingMode = o.h ? "FIXED" : "AUTO"; }
    else { f.primaryAxisSizingMode = o.h ? "FIXED" : "AUTO"; f.counterAxisSizingMode = o.w ? "FIXED" : "AUTO"; }
    return f;
  }
  function add(parent, child, o) {
    parent.appendChild(child);
    if (o && o.fw) child.layoutSizingHorizontal = "FILL";
    if (o && o.fh) child.layoutSizingVertical = "FILL";
    return child;
  }
  function spacer(parent) { const s = AL("H", { name: "Spacer" }); add(parent, s, { fw: true }); return s; }

  function icon(name, size, color, filled) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="' +
      (filled ? "#000000" : "none") + '" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + "</svg>";
    const n = figma.createNodeFromSvg(svg);
    n.name = "icon/" + name;
    n.fills = [];
    for (const v of n.findAll(() => true)) {
      if ("strokes" in v && v.strokes.length) v.strokes = [paint(color || "fg")];
      if ("fills" in v && v.fills.length && v.type !== "FRAME") v.fills = filled ? [paint(color || "fg")] : [];
    }
    n.rescale((size || 20) / 24);
    return n;
  }
  function brandMark(size) {
    const n = figma.createNodeFromSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#131722"/>' +
      '<path d="M7 21l6-6 4 4 8-9" stroke="#2962FF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    n.name = "QFX mark";
    n.fills = [];
    n.rescale((size || 32) / 32);
    return n;
  }
  async function wordmark(size) {
    const r = AL("H", { name: "QFX logo", gap: 8 });
    r.appendChild(await T("QFX", size > 28 ? "NumL" : "NumM", "fg"));
    r.appendChild(brandMark(size || 32));
    return r;
  }
  function setP(inst, map) {
    const props = inst.componentProperties;
    const o = {};
    for (const n of Object.keys(map)) {
      const k = Object.keys(props).find((k) => k === n || k.split("#")[0] === n);
      if (k) o[k] = map[n];
    }
    inst.setProperties(o);
  }
  function svgNode(svg, name) { const n = figma.createNodeFromSvg(svg); n.name = name; n.fills = []; return n; }

  // ---------------------------------------------------------------- رسوم: شموع، خط، عداد
  function series(n, last, vol, seed) {
    const r = rng(seed);
    const c = [last];
    for (let i = 1; i < n; i++) c.unshift(c[0] * (1 + (r() - 0.5) * vol * 2.2 + Math.sin(i / 11) * vol * 0.5));
    return c.map((cl, i) => {
      const op = i ? c[i - 1] : cl * (1 - (r() - 0.5) * vol);
      return { o: op, c: cl, h: Math.max(op, cl) * (1 + r() * vol * 0.6), l: Math.min(op, cl) * (1 - r() * vol * 0.6) };
    });
  }
  function sparkSvg(w, h, vals, up) {
    const col = up ? "#089981" : "#F23645";
    const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, 4 + (1 - (v - mn) / (mx - mn || 1)) * (h - 8)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity="0.28"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + d + " L" + w + " " + h + " L0 " + h + ' Z" fill="url(#g)"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="1.6"/></svg>';
  }
  function gaugeSvg(size, val) {
    const r = size / 2 - 10, cx = size / 2, cy = size / 2 + 2;
    const cols = ["#F23645", "#F7A1A8", "#B2B5BE", "#90A9FF", "#2962FF"];
    const pt = (a) => (cx + r * Math.cos(a)).toFixed(1) + " " + (cy - r * Math.sin(a)).toFixed(1);
    let s = "";
    for (let i = 0; i < 5; i++) {
      const a1 = Math.PI - (i * Math.PI) / 5 - 0.025, a2 = Math.PI - ((i + 1) * Math.PI) / 5 + 0.025;
      s += '<path d="M ' + pt(a1) + " A " + r + " " + r + " 0 0 1 " + pt(a2) + '" stroke="' + cols[i] + '" stroke-width="' + Math.round(size / 20) + '" fill="none"/>';
    }
    const a = Math.PI / 2 - (val * Math.PI) / 2, L = r * 0.78;
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + L * Math.cos(a)).toFixed(1) + '" y2="' + (cy - L * Math.sin(a)).toFixed(1) +
      '" stroke="#131722" stroke-width="3" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#131722"/>';
    const H = size / 2 + 10;
    const n = svgNode('<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + H + '" viewBox="0 0 ' + size + " " + H + '">' + s + "</svg>", "Gauge");
    const kids = n.children;
    const needle = kids.slice(kids.length - 2);
    for (const k of needle) {
      if ("strokes" in k && k.strokes.length) k.strokes = [P("fg")];
      if ("fills" in k && k.fills.length) k.fills = [P("fg")];
    }
    return n;
  }

  async function chart(w, h, m, o) {
    o = o || {};
    const f = figma.createFrame();
    f.name = "Chart · " + m.s;
    f.resize(w, h);
    fill(f, "bg");
    f.clipsContent = true;
    const axisW = 72, top = 34, bottom = 26, pw = w - axisW, ph = h - top - bottom;
    const n = o.n || Math.max(40, Math.floor(pw / 7));
    const d = series(n, m.p, m.vol, o.seed || 11);
    let hi = Math.max.apply(null, d.map((x) => x.h)), lo = Math.min.apply(null, d.map((x) => x.l));
    for (const lv of o.levels || []) { hi = Math.max(hi, lv.p); lo = Math.min(lo, lv.p); }
    const pad = (hi - lo) * 0.08; hi += pad; lo -= pad;
    const Y = (v) => top + ((hi - v) / (hi - lo)) * ph;
    for (let i = 0; i <= 5; i++) {
      const v = lo + ((hi - lo) * i) / 5, y = Math.round(Y(v));
      const g = figma.createRectangle(); g.name = "Grid"; g.resize(pw, 1); g.x = 0; g.y = y; g.fills = [P("surface")]; f.appendChild(g);
      const t = await T(fmt(v, m.d), "Num", "muted"); f.appendChild(t); t.x = pw + 8; t.y = y - 8;
    }
    for (let i = 1; i < 4; i++) {
      const g = figma.createRectangle(); g.name = "Grid"; g.resize(1, ph + top); g.x = Math.round((pw * i) / 4); g.y = 0; g.fills = [P("surface")]; f.appendChild(g);
    }
    const sep = figma.createRectangle(); sep.name = "Price scale border"; sep.resize(1, h); sep.x = pw; sep.y = 0; sep.fills = [P("border")]; f.appendChild(sep);
    const tb = figma.createRectangle(); tb.name = "Time scale border"; tb.resize(w, 1); tb.x = 0; tb.y = h - bottom; tb.fills = [P("border")]; f.appendChild(tb);
    const step = pw / n, bw = Math.max(1, step * 0.62);
    let s = "";
    d.forEach((k, i) => {
      const x = i * step + step / 2, col = k.c >= k.o ? "#089981" : "#F23645";
      const y1 = Y(Math.max(k.o, k.c)), y2 = Y(Math.min(k.o, k.c));
      s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + Y(k.h).toFixed(1) + '" y2="' + Y(k.l).toFixed(1) + '" stroke="' + col + '" stroke-width="1"/>';
      s += '<rect x="' + (x - bw / 2).toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, y2 - y1).toFixed(1) + '" fill="' + col + '"/>';
    });
    const cs = svgNode('<svg xmlns="http://www.w3.org/2000/svg" width="' + pw + '" height="' + h + '" viewBox="0 0 ' + pw + " " + h + '">' + s + "</svg>", "Candles");
    f.appendChild(cs); cs.x = 0; cs.y = 0;

    async function level(price, label, color, dashed) {
      const y = Math.round(Y(price));
      const ln = figma.createLine(); ln.name = "Line · " + label; ln.resize(pw, 0); ln.x = 0; ln.y = y;
      ln.strokes = [paint(color)]; ln.strokeWeight = 1; if (dashed) ln.dashPattern = [4, 3]; f.appendChild(ln);
      const b = AL("H", { name: "Badge · " + label, pad: [2, 6], fill: color, r: 2 });
      b.appendChild(await T(fmt(price, m.d), "NumB", "on-primary")); f.appendChild(b); b.x = pw + 2; b.y = y - 10;
      if (label) {
        const tg = AL("H", { name: "Tag · " + label, pad: [2, 6], fill: color, r: 2 });
        tg.appendChild(await T(label, "Caption", "on-primary")); f.appendChild(tg); tg.x = pw - tg.width - 4; tg.y = y - 10;
      }
    }
    for (const lv of o.levels || []) await level(lv.p, lv.t, lv.c, true);
    await level(m.p, "", m.pct >= 0 ? "up" : "down", true);

    const last = d[d.length - 1];
    const lg = AL("H", { name: "Legend", gap: 10 });
    lg.appendChild(await T(m.s + " · 1H", "NumB", "fg"));
    const lc = last.c >= last.o ? "up" : "down";
    for (const [k, v] of [["O", last.o], ["H", last.h], ["L", last.l], ["C", last.c]]) {
      const g = AL("H", { gap: 3 });
      g.appendChild(await T(k, "Num", "muted")); g.appendChild(await T(fmt(v, m.d), "Num", lc));
      lg.appendChild(g);
    }
    f.appendChild(lg); lg.x = 12; lg.y = 8;
    const labels = ["28", "Nov", "4", "7", "11"];
    for (let i = 0; i < labels.length; i++) {
      const t = await T(labels[i], "Num", "muted"); f.appendChild(t);
      t.x = Math.round((pw * (i + 0.5)) / labels.length); t.y = h - bottom + 6;
    }
    return f;
  }

  async function toolbar(w, sym) {
    const r = AL("H", { name: "Chart toolbar", w: w, h: 44, pad: [0, 12], gap: 6, fill: "bg" });
    side(r, "bottom");
    r.appendChild(await T(sym, "NumB", "fg"));
    const dv = () => { const x = figma.createRectangle(); x.name = "Divider"; x.resize(1, 20); x.fills = [P("border")]; return x; };
    r.appendChild(dv());
    for (const [tf, act] of [["1H", true], ["4H", false], ["1D", false]]) {
      const b = AL("H", { pad: [4, 8], r: 4 });
      b.appendChild(await T(tf, "NumB", act ? "primary" : "fg")); r.appendChild(b);
    }
    r.appendChild(dv());
    r.appendChild(icon("candles", 18, "primary"));
    r.appendChild(icon("bars", 18, "fg"));
    r.appendChild(icon("line", 18, "fg"));
    spacer(r);
    r.appendChild(icon("expand", 18, "fg"));
    return r;
  }

  // ================================================================ صفحة الأساسيات
  {
    const mk = async (dark) => {
      const fr = AL("V", { name: dark ? "Colors · Dark" : "Colors · Light", pad: [40, 40], gap: 24, fill: "bg", r: 16, w: 960 });
      fr.appendChild(await T(dark ? "الألوان — الوضع الداكن" : "الألوان — الوضع الفاتح", "H1"));
      fr.appendChild(await T("متغيرات QFX Color مرتبطة بكل الشاشات والمكونات. بدّل الوضع من لوحة الطبقات (Layer → Mode).", "Small", "muted", { w: 880 }));
      let row = null;
      for (let i = 0; i < TOKENS.length; i++) {
        if (i % 4 === 0) { row = AL("H", { gap: 16, align: "MIN", justify: "MAX" }); add(fr, row, { fw: true }); }
        const [name, css, l, dk] = TOKENS[i];
        const sw = AL("V", { name: "Swatch · " + name, gap: 6, w: 208 });
        const rc = figma.createRectangle(); rc.name = name; rc.resize(208, 80); rc.cornerRadius = 8; rc.fills = [P(name)]; box(rc);
        add(sw, rc);
        sw.appendChild(await T("color/" + name, "NumB", "fg"));
        sw.appendChild(await T((dark ? dk : l) + "  ·  " + css, "Num", "muted"));
        row.appendChild(sw);
      }
      if (dark) setDark(fr);
      return fr;
    };
    const cl = await mk(false), cd = await mk(true);
    pgFound.appendChild(cl); pgFound.appendChild(cd);
    cl.x = 0; cl.y = 0; cd.x = 1040; cd.y = 0;

    const ty = AL("V", { name: "Typography", pad: [40, 40], gap: 20, fill: "bg", r: 16, w: 2000 });
    ty.appendChild(await T("الخطوط", "H1"));
    ty.appendChild(await T("العربية: " + AR + " — اللاتينية والأرقام: " + LA + " (أرقام جدولية كما في الموقع)", "Small", "muted"));
    for (const k of Object.keys(STY)) {
      const [fam, w, size, lh] = STY[k];
      const r = AL("H", { gap: 24, justify: "SPACE_BETWEEN", pad: [12, 0] });
      add(ty, r, { fw: true }); side(r, "bottom");
      r.appendChild(await T("QFX/" + k + " · " + size + "/" + lh + " · " + w, "Num", "muted"));
      r.appendChild(await T(fam === LA ? "2,656.63  +0.77%" : "حلّل أولاً ثم تداول بثقة", k));
    }
    pgFound.appendChild(ty); ty.x = 0; ty.y = Math.max(cl.height, cd.height) + 80;
  }

  // ================================================================ صفحة المكونات
  let compY = 0;
  async function place(node, label) {
    const t = await T(label, "Title", "fg");
    pgComps.appendChild(t); t.x = 0; t.y = compY;
    pgComps.appendChild(node); node.x = 0; node.y = compY + 40;
    compY += 40 + node.height + 80;
  }
  function combine(comps, name, dir) {
    for (const c of comps) pgComps.appendChild(c);
    const set = figma.combineAsVariants(comps, pgComps);
    set.name = name;
    set.layoutMode = dir === "V" ? "VERTICAL" : "HORIZONTAL";
    set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO";
    set.itemSpacing = 16;
    set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 20;
    set.counterAxisAlignItems = "CENTER";
    set.cornerRadius = 8;
    set.fills = [];
    set.strokes = [raw("#9747FF")]; set.dashPattern = [6, 4]; set.strokeWeight = 1;
    return set;
  }
  function textProp(set, prop, def, nodeName) {
    const k = set.addComponentProperty(prop, "TEXT", def);
    for (const v of set.children) {
      const n = v.findOne((x) => x.type === "TEXT" && x.name === nodeName);
      if (n) n.componentPropertyReferences = { characters: k };
    }
    return k;
  }

  // ---- شعارات الرموز
  async function circ(parent, code, size, x, y, shift, ring) {
    const c = CUR[code];
    const e = figma.createEllipse(); e.name = code; e.resize(size, size); e.x = x; e.y = y; e.fills = [raw(c[0])];
    if (ring) { e.strokes = [P("bg")]; e.strokeWeight = Math.max(1.5, size * 0.08); e.strokeAlign = "OUTSIDE"; }
    parent.appendChild(e);
    const t = figma.createText();
    t.fontName = FN(LA, 700);
    t.characters = c[1];
    t.fontSize = size * (c[1].length > 2 ? 0.3 : c[1].length > 1 ? 0.38 : 0.5);
    t.fills = [raw(c[2] || "#FFFFFF")];
    t.textAlignHorizontal = "CENTER"; t.textAlignVertical = "CENTER";
    t.textAutoResize = "NONE"; t.resize(size, size);
    t.x = x - (shift || 0); t.y = y - (shift || 0); t.name = "Glyph";
    parent.appendChild(t);
  }
  const LOGO = {};
  const logoRow = AL("H", { name: "Symbol Logos", gap: 24, pad: [20, 20] });
  for (const m of MARKETS) {
    const c = figma.createComponent();
    c.name = "Symbol Logo/" + m.s; c.resize(32, 32); c.fills = []; c.clipsContent = false;
    const a = m.s.slice(0, 3);
    if (m.s === "WTI" || ["XAU", "XAG", "BTC", "ETH"].includes(a)) await circ(c, m.s === "WTI" ? "WTI" : a, 32, 0, 0);
    else { await circ(c, a, 23, 0, 0, 4.5); await circ(c, m.s.slice(3), 23, 9, 9, 0, true); }
    c.description = "شعار رمز " + m.s + " — دائرة للمعادن والكريبتو، ودائرتان متداخلتان لأزواج العملات.";
    logoRow.appendChild(c);
    LOGO[m.s] = c;
  }
  await place(logoRow, "Symbol Logo");
  function logo(sym, size) { const i = LOGO[sym].createInstance(); i.name = "Logo"; if (size !== 32) i.rescale(size / 32); return i; }

  // ---- الأزرار
  const btnComps = [];
  for (const variant of ["Primary", "Secondary", "Outline"]) {
    for (const size of ["Default", "Pill"]) {
      const pill = size === "Pill";
      const c = figma.createComponent();
      c.name = "Variant=" + variant + ", Size=" + size;
      c.layoutMode = "HORIZONTAL";
      c.primaryAxisAlignItems = "CENTER"; c.counterAxisAlignItems = "CENTER";
      c.resize(120, pill ? 44 : 40);
      c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED";
      c.paddingLeft = c.paddingRight = pill ? 24 : 16;
      c.cornerRadius = pill ? 22 : 8;
      fill(c, variant === "Primary" ? "primary" : variant === "Secondary" ? "secondary" : null);
      if (variant === "Outline") box(c, "input");
      c.appendChild(await T("ابدأ الآن", pill ? "BodyB" : "SmallB", variant === "Primary" ? "on-primary" : "fg", { name: "Label" }));
      btnComps.push(c);
    }
  }
  const BTN = combine(btnComps, "Button");
  textProp(BTN, "Label", "ابدأ الآن", "Label");
  BTN.description = "الأزرار: Primary أزرق، Secondary رمادي فاتح، Outline بحد؛ Pill للأزرار الدائرية الكبيرة.";
  await place(BTN, "Button");
  function button(variant, size, label) {
    const i = BTN.children.find((c) => c.name === "Variant=" + variant + ", Size=" + size).createInstance();
    setP(i, { Label: label }); return i;
  }

  // ---- شارة التغير
  const chipComps = [];
  for (const dir of ["Up", "Down"]) {
    for (const style of ["Chip", "Text"]) {
      const c = figma.createComponent();
      c.name = "Direction=" + dir + ", Style=" + style;
      c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "AUTO";
      c.primaryAxisAlignItems = "CENTER"; c.counterAxisAlignItems = "CENTER";
      const chip = style === "Chip";
      c.paddingLeft = c.paddingRight = chip ? 6 : 0; c.paddingTop = c.paddingBottom = chip ? 2 : 0;
      c.cornerRadius = 4;
      fill(c, chip ? (dir === "Up" ? "up" : "down") : null);
      c.appendChild(await T(dir === "Up" ? "+0.77%" : "-0.58%", "NumB", chip ? "on-primary" : dir === "Up" ? "up" : "down", { name: "Value" }));
      chipComps.push(c);
    }
  }
  const CHIP = combine(chipComps, "Change");
  textProp(CHIP, "Value", "+0.77%", "Value");
  CHIP.description = "نسبة التغير: Chip بخلفية ملونة (قائمة الجوال)، Text نص ملون (الجداول).";
  await place(CHIP, "Change");
  function change(pct, style) {
    const i = CHIP.children.find((c) => c.name === "Direction=" + (pct >= 0 ? "Up" : "Down") + ", Style=" + style).createInstance();
    i.name = "Change"; setP(i, { Value: pctTxt(pct) }); return i;
  }

  // ---- فلتر دائري
  const pillComps = [];
  for (const st of ["Active", "Default"]) {
    const c = figma.createComponent();
    c.name = "State=" + st;
    c.layoutMode = "HORIZONTAL"; c.primaryAxisAlignItems = "CENTER"; c.counterAxisAlignItems = "CENTER";
    c.resize(80, 34); c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED";
    c.paddingLeft = c.paddingRight = 16; c.cornerRadius = 17;
    fill(c, st === "Active" ? "fg" : "secondary");
    c.appendChild(await T("الكل", "SmallB", st === "Active" ? "bg" : "fg", { name: "Label" }));
    pillComps.push(c);
  }
  const PILL = combine(pillComps, "Category Pill");
  textProp(PILL, "Label", "الكل", "Label");
  await place(PILL, "Category Pill");
  function pill(label, active) {
    const i = PILL.children.find((c) => c.name === "State=" + (active ? "Active" : "Default")).createInstance();
    setP(i, { Label: label }); return i;
  }
  async function pillsRow(labels, activeIdx) {
    const r = AL("H", { name: "Categories", gap: 8, justify: "MAX" });
    for (let i = labels.length - 1; i >= 0; i--) r.appendChild(pill(labels[i], i === activeIdx));
    return r;
  }

  // ---- إحصائية
  const STAT = figma.createComponent();
  STAT.name = "Stat";
  STAT.layoutMode = "VERTICAL"; STAT.counterAxisAlignItems = "MAX"; STAT.itemSpacing = 4;
  STAT.resize(220, 60); STAT.counterAxisSizingMode = "FIXED"; STAT.primaryAxisSizingMode = "AUTO";
  STAT.paddingTop = STAT.paddingBottom = 12; STAT.fills = []; side(STAT, "bottom");
  STAT.appendChild(await T("أعلى سعر (24س)", "Small", "muted", { name: "Label" }));
  STAT.appendChild(await T("2,662.10", "NumM", "fg", { name: "Value" }));
  STAT.findOne((n) => n.name === "Label").componentPropertyReferences = { characters: STAT.addComponentProperty("Label", "TEXT", "أعلى سعر (24س)") };
  STAT.findOne((n) => n.name === "Value").componentPropertyReferences = { characters: STAT.addComponentProperty("Value", "TEXT", "2,662.10") };
  pgComps.appendChild(STAT);
  await place(STAT, "Stat");
  function stat(label, value) { const i = STAT.createInstance(); setP(i, { Label: label, Value: value }); return i; }

  // ---- صف قائمة المراقبة (جوال)
  const ROWM = figma.createComponent();
  ROWM.name = "Watchlist Row/Mobile";
  ROWM.layoutMode = "HORIZONTAL"; ROWM.counterAxisAlignItems = "CENTER"; ROWM.itemSpacing = 12;
  ROWM.resize(390, 64); ROWM.primaryAxisSizingMode = "FIXED"; ROWM.counterAxisSizingMode = "AUTO";
  ROWM.paddingLeft = ROWM.paddingRight = 16; ROWM.paddingTop = ROWM.paddingBottom = 12;
  fill(ROWM, "bg"); side(ROWM, "bottom");
  {
    const pc = AL("V", { name: "Price", gap: 4, align: "MIN" });
    pc.appendChild(await T("2,656.63", "NumM", "fg", { name: "Price" }));
    pc.appendChild(change(0.77, "Chip"));
    ROWM.appendChild(pc);
    const nc = AL("V", { name: "Name", gap: 2 });
    nc.appendChild(await T("XAUUSD", "NumM", "fg", { name: "Symbol" }));
    nc.appendChild(await T("الذهب مقابل الدولار", "Small", "muted", { name: "Name" }));
    add(ROWM, nc, { fw: true });
    const lg = logo("XAUUSD", 38); ROWM.appendChild(lg);
    for (const [prop, def, node] of [["Symbol", "XAUUSD", "Symbol"], ["Name", "الذهب مقابل الدولار", "Name"], ["Price", "2,656.63", "Price"]]) {
      const k = ROWM.addComponentProperty(prop, "TEXT", def);
      ROWM.findOne((n) => n.type === "TEXT" && n.name === node).componentPropertyReferences = { characters: k };
    }
    lg.componentPropertyReferences = { mainComponent: ROWM.addComponentProperty("Logo", "INSTANCE_SWAP", LOGO.XAUUSD.id) };
    ROWM.description = "صف قائمة المراقبة بأسلوب تطبيق الجوال: شعار، رمز واسم، سعر وشارة تغير.";
  }
  pgComps.appendChild(ROWM);
  await place(ROWM, "Watchlist Row / Mobile");
  function rowM(m) {
    const i = ROWM.createInstance();
    setP(i, { Symbol: m.s, Name: m.n, Price: fmt(m.p, m.d), Logo: LOGO[m.s].id });
    const ch = i.findOne((n) => n.name === "Change" && n.type === "INSTANCE");
    if (ch) setP(ch, { Direction: m.pct >= 0 ? "Up" : "Down", Value: pctTxt(m.pct) });
    return i;
  }

  // ---- صف قائمة المراقبة (كمبيوتر)
  const ROWD = figma.createComponent();
  ROWD.name = "Watchlist Row/Desktop";
  ROWD.layoutMode = "HORIZONTAL"; ROWD.counterAxisAlignItems = "CENTER"; ROWD.itemSpacing = 12;
  ROWD.resize(300, 36); ROWD.primaryAxisSizingMode = "FIXED"; ROWD.counterAxisSizingMode = "FIXED";
  ROWD.paddingLeft = ROWD.paddingRight = 12; fill(ROWD, "bg");
  {
    const cw = AL("H", { name: "Change cell", w: 56, h: 20 }); cw.appendChild(change(0.77, "Text")); ROWD.appendChild(cw);
    ROWD.appendChild(await T("2,656.63", "Num", "fg", { name: "Price" }));
    const ng = AL("H", { name: "Symbol cell", gap: 8, justify: "MAX" });
    ng.appendChild(await T("XAUUSD", "NumB", "fg", { name: "Symbol" }));
    const lg = logo("XAUUSD", 18); ng.appendChild(lg);
    add(ROWD, ng, { fw: true });
    for (const [prop, def] of [["Symbol", "XAUUSD"], ["Price", "2,656.63"]]) {
      const k = ROWD.addComponentProperty(prop, "TEXT", def);
      ROWD.findOne((n) => n.type === "TEXT" && n.name === prop).componentPropertyReferences = { characters: k };
    }
    lg.componentPropertyReferences = { mainComponent: ROWD.addComponentProperty("Logo", "INSTANCE_SWAP", LOGO.XAUUSD.id) };
  }
  pgComps.appendChild(ROWD);
  await place(ROWD, "Watchlist Row / Desktop");
  function rowD(m, active) {
    const i = ROWD.createInstance();
    setP(i, { Symbol: m.s, Price: fmt(m.p, m.d), Logo: LOGO[m.s].id });
    const ch = i.findOne((n) => n.name === "Change" && n.type === "INSTANCE");
    if (ch) setP(ch, { Direction: m.pct >= 0 ? "Up" : "Down", Value: pctTxt(m.pct) });
    if (active) i.fills = [P("primary-soft")];
    return i;
  }

  // ---- الشريط السفلي (جوال)
  const TABS = [["Menu", "القائمة", "menu"], ["Ideas", "الأفكار", "bulb"], ["Explore", "استكشف", "compass"], ["Chart", "الشارت", "candles"], ["Watchlist", "المراقبة", "star"]];
  const navComps = [];
  for (const [act] of TABS) {
    const c = figma.createComponent();
    c.name = "Active=" + act;
    c.layoutMode = "HORIZONTAL"; c.primaryAxisAlignItems = "SPACE_BETWEEN"; c.counterAxisAlignItems = "CENTER";
    c.resize(390, 56); c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED";
    c.paddingLeft = c.paddingRight = 4;
    fill(c, "bg"); side(c, "top");
    for (const [key, label, ic] of TABS) {
      const on = key === act;
      const it = AL("V", { name: "Tab · " + key, gap: 2, align: "CENTER", w: 76 });
      it.appendChild(icon(ic, 22, on ? "primary" : "muted", on && ic === "star"));
      it.appendChild(await T(label, "Caption", on ? "primary" : "muted", { align: "CENTER" }));
      c.appendChild(it);
    }
    navComps.push(c);
  }
  const NAV = combine(navComps, "Bottom Nav", "V");
  NAV.description = "شريط التبويبات السفلي للجوال (بأسلوب التطبيق): المراقبة، الشارت، استكشف، الأفكار، القائمة.";
  await place(NAV, "Bottom Nav");
  function nav(active) { const i = NAV.children.find((c) => c.name === "Active=" + active).createInstance(); i.name = "Bottom Nav"; return i; }

  // ---- رأس الجوال
  const HDRM = figma.createComponent();
  HDRM.name = "Header/Mobile";
  HDRM.layoutMode = "HORIZONTAL"; HDRM.primaryAxisAlignItems = "SPACE_BETWEEN"; HDRM.counterAxisAlignItems = "CENTER";
  HDRM.resize(390, 64); HDRM.primaryAxisSizingMode = "FIXED"; HDRM.counterAxisSizingMode = "FIXED";
  HDRM.paddingLeft = HDRM.paddingRight = 16; fill(HDRM, "bg"); side(HDRM, "bottom");
  {
    const l = AL("H", { gap: 20 }); l.appendChild(icon("menu", 22)); l.appendChild(icon("search", 22));
    HDRM.appendChild(l);
    HDRM.appendChild(await wordmark(32));
  }
  pgComps.appendChild(HDRM);
  await place(HDRM, "Header / Mobile");

  // ================================================================ أجزاء الشاشات
  async function desktopHeader() {
    const h = AL("H", { name: "Header", w: 1440, h: 64, pad: [0, 76], justify: "SPACE_BETWEEN", fill: "bg" });
    side(h, "bottom");
    const l = AL("H", { gap: 20 });
    l.appendChild(button("Primary", "Pill", "ابدأ الآن"));
    l.appendChild(icon("user", 22)); l.appendChild(icon("moon", 22));
    h.appendChild(l);
    const n = AL("H", { gap: 32 });
    for (const [t, a] of [["كيف نعمل", 0], ["الأفكار والأخبار", 0], ["التوصيات", 0], ["الأسواق", 1]]) n.appendChild(await T(t, "BodyB", a ? "primary" : "fg"));
    h.appendChild(n);
    const r = AL("H", { gap: 20 });
    const sp = AL("H", { name: "Search", w: 340, h: 44, r: 22, fill: "secondary", pad: [0, 16], justify: "SPACE_BETWEEN" });
    const kb = AL("H", { name: "Kbd", pad: [2, 6], r: 4 }); box(kb, "input"); kb.appendChild(await T("Ctrl K", "Caption", "muted"));
    sp.appendChild(kb);
    const sr = AL("H", { gap: 8 }); sr.appendChild(await T("بحث", "Body", "muted")); sr.appendChild(icon("search", 18, "muted"));
    sp.appendChild(sr);
    r.appendChild(sp); r.appendChild(await wordmark(32));
    h.appendChild(r);
    return h;
  }
  async function footer(w) {
    const f = AL("V", { name: "Footer", w: w, pad: [40, w > 500 ? 76 : 16], gap: 12, fill: "bg" });
    side(f, "top");
    const r = AL("H", { justify: "SPACE_BETWEEN" }); add(f, r, { fw: true });
    r.appendChild(await T("QFX © 2026", "Caption", "muted"));
    r.appendChild(await wordmark(28));
    const d = await T("تنبيه المخاطر: تداول العملات والعقود مقابل الفروقات ينطوي على مخاطر عالية وقد لا يناسب جميع المستثمرين. الأداء السابق لا يضمن النتائج المستقبلية.", "Small", "muted", { w: 600 });
    add(f, d, { fw: true });
    return f;
  }
  async function gauge(title, val, rating, size, counts) {
    const g = AL("V", { name: "Gauge · " + title, gap: 8, align: "CENTER" });
    g.appendChild(await T(title, "Title"));
    g.appendChild(gaugeSvg(size, val));
    g.appendChild(await T(RATING[rating][0], size > 220 ? "H2" : "BodyB", RATING[rating][1], { align: "CENTER" }));
    if (counts) {
      const r = AL("H", { gap: 16 });
      r.appendChild(await T("شراء " + counts[2], "Small", "primary"));
      r.appendChild(await T("محايد " + counts[1], "Small", "muted"));
      r.appendChild(await T("بيع " + counts[0], "Small", "down"));
      g.appendChild(r);
    }
    return g;
  }
  async function symbolHeader(m, big) {
    const r = AL("H", { name: "Symbol header", gap: big ? 16 : 12, justify: "MAX" });
    const tc = AL("V", { gap: 4 });
    tc.appendChild(await T(m.n, big ? "H1" : "H2"));
    const meta = AL("H", { gap: 8 });
    if (big) meta.appendChild(await T(m.en, "Small", "muted"));
    meta.appendChild(await T(m.c, "Small", "muted"));
    const bd = AL("H", { name: "Symbol badge", pad: [2, 6], r: 4, fill: "secondary" });
    bd.appendChild(await T(m.s, "NumB", "fg")); meta.appendChild(bd);
    tc.appendChild(meta);
    r.appendChild(tc); r.appendChild(logo(m.s, big ? 56 : 44));
    return r;
  }
  async function priceBlock(m, big) {
    const b = AL("V", { name: "Price block", gap: 8 });
    const r = AL("H", { gap: 10, align: "MAX" });
    r.appendChild(await T((m.ch >= 0 ? "+" : "") + fmt(m.ch, m.d) + " (" + pctTxt(m.pct) + ")", big ? "Title" : "NumM", m.pct >= 0 ? "up" : "down"));
    r.appendChild(await T("USD", "Small", "muted"));
    r.appendChild(await T(fmt(m.p, m.d), big ? "NumXL" : "NumL", "fg"));
    b.appendChild(r);
    const st = AL("H", { gap: 6 });
    st.appendChild(await T("السوق مفتوح • آخر 24 ساعة", "Small", "muted"));
    const dot = figma.createEllipse(); dot.resize(8, 8); dot.fills = [P("up")]; st.appendChild(dot);
    b.appendChild(st);
    return b;
  }
  const xau = M.XAUUSD;
  const xauLevels = [
    { p: 2680, t: "TP1", c: "up" },
    { p: 2650, t: "شراء", c: "primary" },
    { p: 2632, t: "SL", c: "down" },
  ];
  const stats = [
    ["الافتتاح (24س)", "2,636.27"], ["أعلى سعر (24س)", "2,662.10"], ["أدنى سعر (24س)", "2,628.40"], ["التغير (24س)", "+0.77%"],
    ["أدنى 3 أسابيع", "2,604.15"], ["أعلى 3 أسابيع", "2,688.92"], ["الملخص الفني", "شراء"], ["الفئة", "المعادن"],
  ];
  async function statsGrid(cols, gap) {
    const g = AL("V", { name: "Key stats" });
    for (let i = 0; i < stats.length; i += cols) {
      const r = AL("H", { gap: gap, align: "MIN" }); add(g, r, { fw: true });
      for (let j = cols - 1; j >= 0; j--) add(r, stat(stats[i + j][0], stats[i + j][1]), { fw: true });
    }
    return g;
  }

  // ================================================================ الشاشات
  const screens = [];

  // ---- جوال: قائمة المراقبة
  const mWatch = AL("V", { name: "Mobile · Watchlist", w: 390, h: 844, fill: "bg", align: "MIN" });
  mWatch.clipsContent = true;
  {
    add(mWatch, HDRM.createInstance(), { fw: true });
    const tr = AL("H", { pad: [20, 16, 8, 16], justify: "SPACE_BETWEEN" }); add(mWatch, tr, { fw: true });
    const sc = AL("H", { name: "Search", w: 40, h: 40, r: 20, fill: "secondary", justify: "CENTER" }); sc.appendChild(icon("search", 20));
    tr.appendChild(sc); tr.appendChild(await T("قائمة المراقبة", "H1"));
    const pr = await pillsRow(["الكل", "العملات", "المعادن", "الطاقة", "الكريبتو"], 0);
    pr.paddingRight = 16; pr.paddingBottom = 12; add(mWatch, pr, { fw: true });
    side(pr, "bottom");
    for (const m of MARKETS.slice(0, 8)) add(mWatch, rowM(m), { fw: true });
    const n = nav("Watchlist"); mWatch.appendChild(n); n.layoutPositioning = "ABSOLUTE"; n.x = 0; n.y = 844 - 56;
  }
  screens.push(mWatch);

  // ---- جوال: صفحة الرمز
  const mSym = AL("V", { name: "Mobile · Symbol", w: 390, fill: "bg", align: "MIN" });
  {
    add(mSym, HDRM.createInstance(), { fw: true });
    const top = AL("V", { pad: [16, 16], gap: 16 }); add(mSym, top, { fw: true });
    add(top, await symbolHeader(xau, false), { fw: true });
    add(top, await priceBlock(xau, false), { fw: true });
    add(mSym, await toolbar(390, "XAUUSD"));
    mSym.appendChild(await chart(390, 380, xau, { levels: xauLevels, seed: 21 }));
    const bw = AL("V", { pad: [12, 16] }); add(mSym, bw, { fw: true });
    add(bw, button("Secondary", "Default", "فتح الشارت بملء الشاشة"), { fw: true });
    const sec = AL("V", { pad: [24, 16, 8, 16], gap: 8 }); add(mSym, sec, { fw: true });
    sec.appendChild(await T("إحصائيات رئيسية", "H2"));
    add(sec, await statsGrid(2, 24), { fw: true });
    const tch = AL("V", { pad: [32, 16], gap: 20, align: "CENTER" }); add(mSym, tch, { fw: true });
    add(tch, await T("التحليل الفني لـ XAUUSD", "H2"), { fw: true });
    tch.appendChild(await gauge("الملخص", 0.45, "buy", 260));
    const gr = AL("H", { gap: 16, justify: "CENTER" });
    gr.appendChild(await gauge("المذبذبات", 0.05, "neutral", 160, [2, 6, 3]));
    gr.appendChild(await gauge("المتوسطات المتحركة", 0.7, "strong_buy", 160, [1, 0, 7]));
    tch.appendChild(gr);
    add(mSym, nav("Watchlist"), { fw: true });
  }
  screens.push(mSym);

  // ---- جوال: الشارت بملء الشاشة
  const mChart = AL("V", { name: "Mobile · Chart", w: 390, h: 844, fill: "bg", align: "MIN" });
  mChart.clipsContent = true;
  {
    const eur = M.EURUSD;
    add(mChart, HDRM.createInstance(), { fw: true });
    const bar = AL("H", { name: "Symbol bar", pad: [8, 12], gap: 8 }); add(mChart, bar, { fw: true }); side(bar, "bottom");
    const sc = AL("H", { name: "Search", w: 36, h: 36, r: 18, fill: "secondary", justify: "CENTER" }); sc.appendChild(icon("search", 18));
    bar.appendChild(sc); spacer(bar);
    bar.appendChild(change(eur.pct, "Text"));
    bar.appendChild(await T(fmt(eur.p, eur.d), "NumM", "fg"));
    bar.appendChild(await T(eur.s, "NumM", "fg"));
    bar.appendChild(logo(eur.s, 24));
    add(mChart, await toolbar(390, eur.s));
    mChart.appendChild(await chart(390, 844 - 64 - 53 - 44 - 56, eur, { seed: 5 }));
    const n = nav("Chart"); mChart.appendChild(n); n.layoutPositioning = "ABSOLUTE"; n.x = 0; n.y = 844 - 56;
  }
  screens.push(mChart);

  // ---- كمبيوتر: صفحة الرمز
  const dSym = AL("V", { name: "Desktop · Symbol", w: 1440, fill: "bg", align: "MIN" });
  {
    add(dSym, await desktopHeader(), { fw: true });
    const body = AL("V", { name: "Body", pad: [24, 76, 64, 76], gap: 20 }); add(dSym, body, { fw: true });
    const bc = AL("H", { name: "Breadcrumb", gap: 4 });
    bc.appendChild(await T("XAUUSD", "NumB", "fg")); bc.appendChild(icon("chevron", 14, "muted"));
    bc.appendChild(await T("المعادن", "Small", "muted")); bc.appendChild(icon("chevron", 14, "muted"));
    bc.appendChild(await T("الأسواق", "Small", "muted"));
    body.appendChild(bc);
    add(body, await symbolHeader(xau, true), { fw: true });
    add(body, await priceBlock(xau, true), { fw: true });
    const tabs = AL("H", { name: "Tabs", gap: 4, justify: "MAX" }); add(body, tabs, { fw: true }); side(tabs, "bottom");
    for (const [t, a] of [["الأخبار", 0], ["التوصيات", 0], ["الفنيات", 0], ["نظرة عامة", 0], ["الشارت", 1]]) {
      const tb = AL("H", { name: "Tab · " + t, pad: [12, 16] });
      tb.appendChild(await T(t, "BodyB", a ? "fg" : "muted"));
      if (a) side(tb, "bottom", "fg", 2);
      tabs.appendChild(tb);
    }
    const panel = AL("H", { name: "Chart + Watchlist", h: 600, r: 12, align: "MIN" }); add(body, panel, { fw: true });
    box(panel); panel.clipsContent = true;
    const wl = AL("V", { name: "Watchlist panel", w: 300, align: "MIN" }); add(panel, wl, { fh: true }); side(wl, "right");
    const wh = AL("H", { name: "Title", h: 44, pad: [0, 12], justify: "MAX" }); add(wl, wh, { fw: true }); side(wh, "bottom");
    wh.appendChild(await T("قائمة المراقبة", "SmallB"));
    const colh = AL("H", { name: "Columns", h: 28, pad: [0, 12], gap: 12 }); add(wl, colh, { fw: true }); side(colh, "bottom");
    const c1 = AL("H", { w: 56 }); c1.appendChild(await T("التغير%", "Caption", "muted")); colh.appendChild(c1);
    colh.appendChild(await T("السعر", "Caption", "muted"));
    const c3 = AL("H", { justify: "MAX" }); c3.appendChild(await T("الرمز", "Caption", "muted")); add(colh, c3, { fw: true });
    for (const m of MARKETS) add(wl, rowD(m, m.s === "XAUUSD"), { fw: true });
    const cc = AL("V", { name: "Chart column", align: "MIN" }); add(panel, cc, { fw: true, fh: true });
    add(cc, await toolbar(988, "XAUUSD"), { fw: true });
    cc.appendChild(await chart(988, 556, xau, { levels: xauLevels, seed: 21 }));

    const s1 = AL("V", { name: "Key stats section", pad: [36, 0, 0, 0], gap: 8 }); add(body, s1, { fw: true });
    s1.appendChild(await T("إحصائيات رئيسية", "H2"));
    add(s1, await statsGrid(4, 32), { fw: true });

    const s2 = AL("V", { name: "Technicals section", pad: [36, 0, 0, 0], gap: 8 }); add(body, s2, { fw: true });
    s2.appendChild(await T("التحليل الفني لـ XAUUSD", "H2"));
    s2.appendChild(await T("ملخص لمؤشرات إطار الساعة — تعليمي وليس توصية.", "Small", "muted"));
    const gr = AL("H", { gap: 96, justify: "CENTER", align: "MAX", pad: [24, 0] }); add(s2, gr, { fw: true });
    gr.appendChild(await gauge("المتوسطات المتحركة", 0.7, "strong_buy", 200, [1, 0, 7]));
    gr.appendChild(await gauge("الملخص", 0.45, "buy", 280));
    gr.appendChild(await gauge("المذبذبات", 0.05, "neutral", 200, [2, 6, 3]));

    const two = AL("H", { name: "Ideas + News", gap: 48, align: "MIN", pad: [36, 0, 0, 0] }); add(body, two, { fw: true });
    const news = AL("V", { name: "News", gap: 0 }); add(two, news, { fw: true });
    news.appendChild(await T("الأخبار", "H2"));
    for (const [title, meta] of [["مؤشر أسعار المستهلك (شهري)", "قبل ساعة • المفكرة"], ["الذهب يختبر مقاومة 2380", "قبل ساعتين • QFX"], ["ترقب بيانات التضخم الأمريكية", "قبل 5 ساعات • Reuters"], ["النفط تحت ضغط عند 78.5", "قبل 8 ساعات • QFX"]]) {
      const it = AL("V", { pad: [12, 0], gap: 2 }); add(news, it, { fw: true }); side(it, "bottom");
      it.appendChild(await T(meta, "Caption", "muted")); it.appendChild(await T(title, "BodyB"));
    }
    const ideas = AL("V", { name: "Ideas", gap: 0 }); add(two, ideas, { fw: true });
    ideas.appendChild(await T("التوصيات على XAUUSD", "H2"));
    for (const [dir, price, status, res, time] of [["شراء", "2,650.00", "مفتوحة", null, "قبل ساعة"], ["شراء", "2,350.50", "تحقق الهدف", "+145", "قبل 3 أيام"], ["بيع", "2,402.00", "ضرب الوقف", "-30", "قبل أسبوع"]]) {
      const it = AL("H", { pad: [12, 0], gap: 12 }); add(ideas, it, { fw: true }); side(it, "bottom");
      it.appendChild(await T(time, "Caption", "muted")); spacer(it);
      if (res) it.appendChild(await T(res, "NumB", res[0] === "+" ? "up" : "down"));
      it.appendChild(await T(status, "Small", "muted"));
      it.appendChild(await T("@ " + price, "Num"));
      const bd = AL("H", { pad: [2, 8], r: 4, fill: dir === "شراء" ? "up" : "down" }); bd.appendChild(await T(dir, "Caption", "on-primary"));
      it.appendChild(bd);
    }
    add(dSym, await footer(1440), { fw: true });
  }
  screens.push(dSym);

  // ---- كمبيوتر: الصفحة الرئيسية
  const dHome = AL("V", { name: "Desktop · Home", w: 1440, fill: "bg", align: "MIN" });
  {
    add(dHome, await desktopHeader(), { fw: true });
    const hero = AL("V", { name: "Hero", pad: [96, 76, 72, 76], gap: 24, fill: "bg" }); add(dHome, hero, { fw: true });
    setDark(hero); hero.clipsContent = true;
    const art = svgNode(sparkSvg(1440, 520, series(90, 100, 0.012, 3).map((x) => x.c), true).replace(/#089981/g, "#2962FF"), "Hero art");
    hero.appendChild(art); art.layoutPositioning = "ABSOLUTE"; art.x = 0; art.y = 80; art.opacity = 0.55;
    hero.appendChild(await T("حلّل أولاً.", "Hero", "#FFFFFF"));
    hero.appendChild(await T("ثم تداول بثقة.", "Hero", "primary"));
    hero.appendChild(await T("انضم إلى مجتمع QFX للتداول: حساب لدى وسيط مرخّص عبر وكالتنا، توصيات يومية بسجل أداء شفاف، تحليلات فنية، وأخبار المفكرة الاقتصادية بالعربية.", "Body", "muted", { w: 600 }));
    const sp = AL("H", { name: "Hero search", w: 600, h: 52, r: 26, fill: "#FFFFFF", pad: [0, 20], gap: 10, justify: "MAX" });
    sp.appendChild(await T("ابحث عن سوق — الذهب، EURUSD، بيتكوين...", "Body", "#787B86"));
    sp.appendChild(icon("search", 20, "#131722"));
    hero.appendChild(sp);
    const ctas = AL("H", { gap: 12 });
    ctas.appendChild(button("Outline", "Pill", "سجل التوصيات"));
    ctas.appendChild(button("Primary", "Pill", "افتح حساباً عبر الوكالة"));
    hero.appendChild(ctas);
    const hs = AL("H", { name: "Hero stats", gap: 72, pad: [32, 0, 0, 0] }); add(hero, hs, { fw: true }); side(hs, "top");
    for (const [v, l, c] of [["5", "توصية منشورة", "#FFFFFF"], ["+165", "مجموع النقاط", "up"], ["66.7%", "نسبة نجاح التوصيات", "#FFFFFF"]]) {
      const b = AL("V", { gap: 4 }); b.appendChild(await T(l, "Small", "muted")); b.appendChild(await T(v, "NumL", c)); hs.appendChild(b);
    }

    const ms = AL("V", { name: "Market summary", pad: [64, 76, 32, 76], gap: 20 }); add(dHome, ms, { fw: true });
    const tr = AL("H", { gap: 6 }); tr.appendChild(icon("chevron", 20)); tr.appendChild(await T("ملخص السوق", "H1")); ms.appendChild(tr);
    ms.appendChild(await pillsRow(["المعادن", "العملات", "الطاقة", "الكريبتو"], 0));
    const cards = AL("H", { name: "Cards", gap: 16, align: "MIN" }); add(ms, cards, { fw: true });
    for (const s of ["BTCUSD", "WTI", "XAGUSD", "XAUUSD"]) {
      const m = M[s];
      const cd = AL("V", { name: "Card · " + s, pad: [16, 16], gap: 6, r: 12, fill: s === "XAUUSD" ? "surface" : "bg" });
      box(cd, s === "XAUUSD" ? "primary" : "border");
      add(cards, cd, { fw: true });
      const h = AL("H", { gap: 8 }); h.appendChild(await T(s, "NumB")); h.appendChild(logo(s, 22)); cd.appendChild(h);
      cd.appendChild(await T(fmt(m.p, m.d), "NumM"));
      cd.appendChild(change(m.pct, "Text"));
      cd.appendChild(svgNode(sparkSvg(276, 48, series(40, m.p, m.vol, s.length * 7).map((x) => x.c), m.pct >= 0), "Sparkline"));
    }
    const pnl = AL("H", { name: "Summary chart", h: 420, r: 12, align: "MIN" }); add(ms, pnl, { fw: true }); box(pnl); pnl.clipsContent = true;
    const lst = AL("V", { name: "List", w: 280, align: "MIN" }); add(pnl, lst, { fh: true }); side(lst, "right");
    for (const s of ["XAUUSD", "XAGUSD", "WTI", "BTCUSD", "EURUSD", "GBPUSD"]) {
      const r = rowD(M[s], s === "XAUUSD"); add(lst, r, { fw: true });
    }
    pnl.appendChild(await chart(1008, 420, xau, { seed: 9 }));

    const id = AL("V", { name: "Latest ideas", pad: [48, 76, 64, 76], gap: 20 }); add(dHome, id, { fw: true });
    const it = AL("H", { gap: 6 }); it.appendChild(icon("chevron", 20)); it.appendChild(await T("أحدث التوصيات", "H1")); id.appendChild(it);
    const grid = AL("H", { gap: 24, align: "MIN" }); add(id, grid, { fw: true });
    const IDEAS = [
      ["GBPUSD", "شراء GBPUSD من 1.26400 — الهدف 1.26900", "تحقق الهدف ✅ +50", true],
      ["WTI", "بيع USOIL من 78.40 — الهدف 77.00", "رفض عند مقاومة 78.5", false],
      ["XAUUSD", "شراء XAUUSD من 2,650.00 — الهدف 2,680.00", "شراء من منطقة طلب على إطار الساعة", true],
    ];
    for (const [s, title, note, buy] of IDEAS) {
      const c = AL("V", { name: "Idea · " + s, gap: 10 }); add(grid, c, { fw: true });
      const mc = figma.createFrame(); mc.name = "Idea chart"; mc.resize(413, 180); mc.cornerRadius = 8; fill(mc, "surface"); mc.clipsContent = true; box(mc);
      const zt = figma.createRectangle(); zt.name = "TP zone"; zt.resize(60, 44); zt.x = 353; zt.y = buy ? 16 : 120; zt.fills = [raw("#089981", 0.18)]; mc.appendChild(zt);
      const zs = figma.createRectangle(); zs.name = "SL zone"; zs.resize(60, 24); zs.x = 353; zs.y = buy ? 64 : 92; zs.fills = [raw("#F23645", 0.18)]; mc.appendChild(zs);
      const sk = svgNode(sparkSvg(350, 150, series(48, 100, 0.01, s.length * 13).map((x) => x.c), true).replace(/#089981/g, "#131722").replace(/stop-opacity="0.28"/, 'stop-opacity="0"'), "Price");
      mc.appendChild(sk); sk.x = 0; sk.y = 20;
      for (const v of sk.findAll((n) => "strokes" in n && n.strokes.length > 0)) v.strokes = [P("fg")];
      const bd = AL("H", { pad: [2, 8], r: 4, fill: buy ? "up" : "down" }); bd.appendChild(await T(buy ? "شراء" : "بيع", "Caption", "on-primary"));
      mc.appendChild(bd); bd.x = 413 - bd.width - 10; bd.y = 10;
      c.appendChild(mc);
      const hr = AL("H", { gap: 8 }); hr.appendChild(await T("• منذ ساعة", "Caption", "muted")); hr.appendChild(await T(s, "NumB")); hr.appendChild(logo(s, 18));
      c.appendChild(hr);
      add(c, await T(title, "Title"), { fw: true });
      add(c, await T(note, "Small", "muted"), { fw: true });
      c.appendChild(await T("QFX • استراتيجية الاختراق", "Caption", "muted"));
    }
    add(dHome, await footer(1440), { fw: true });
  }
  screens.push(dHome);

  // ---------------------------------------------------------------- ترتيب الشاشات + نسخ الوضع الداكن
  async function label(text, x, y) { const t = await T(text, "H2"); pgScreens.appendChild(t); t.x = x; t.y = y; }
  for (const s of screens) pgScreens.appendChild(s);
  let x = 0;
  await label("Mobile — Light", 0, -64);
  for (const s of [mWatch, mSym, mChart]) { s.x = x; s.y = 0; x += 430; }
  const darkMobiles = [mWatch, mSym, mChart].map((s) => { const c = s.clone(); c.name = s.name + " (Dark)"; setDark(c); pgScreens.appendChild(c); return c; });
  x += 80; await label("Mobile — Dark", x, -64);
  for (const c of darkMobiles) { c.x = x; c.y = 0; x += 430; }
  const mobileH = Math.max(mWatch.height, mSym.height, mChart.height);
  const y2 = mobileH + 200;
  await label("Desktop — Light", 0, y2 - 64);
  dSym.x = 0; dSym.y = y2;
  dHome.x = 1540; dHome.y = y2;
  const dSymDark = dSym.clone(); dSymDark.name = "Desktop · Symbol (Dark)"; setDark(dSymDark); pgScreens.appendChild(dSymDark);
  dSymDark.x = 3080; dSymDark.y = y2;
  await label("Desktop — Dark", 3080, y2 - 64);

  await figma.setCurrentPageAsync(pgScreens);
  figma.viewport.scrollAndZoomIntoView(pgScreens.children);
  return "تم: " + MARKETS.length + " شعارات، 8 مكونات، " + (screens.length + 4) + " شاشات — خط عربي: " + AR + "، أرقام: " + LA;
}

// تشغيل كإضافة تطوير (Plugins → Development) أو داخل Scripter
const __isScripter = typeof print !== "undefined";
main().then(
  (msg) => { if (__isScripter) print(msg); else figma.closePlugin("✅ " + msg); },
  (err) => {
    const msg = "خطأ: " + (err && err.message ? err.message : String(err));
    if (__isScripter) print(msg); else figma.closePlugin("❌ " + msg);
  },
);
