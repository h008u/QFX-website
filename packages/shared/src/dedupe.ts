// كشف الخبر المكرر حتى لو انكتب بصياغة ثانية أو بلغة ثانية (منقول من Spir-Telegrambot)
// العنوان يتحول لـ "بصمة": المفاهيم الموحدة (الذهب = gold = XAU) + الأرقام + اتجاه الحركة.

const CONCEPTS: Record<string, string[]> = {
  GOLD: ["gold", "xau", "xauusd", "bullion", "الذهب", "ذهب", "المعدن الأصفر", "المعدن النفيس"],
  SILVER: ["silver", "xag", "الفضة", "فضة"],
  OIL: ["oil", "crude", "brent", "wti", "النفط", "نفط", "الخام", "برنت", "خام"],
  USD: ["dollar", "usd", "greenback", "dxy", "us", "u.s", "american", "الدولار", "دولار", "الأمريكي", "الامريكي", "الأمريكية", "أمريكا", "امريكا"],
  EUR: ["euro", "eur", "eurusd", "اليورو", "يورو"],
  GBP: ["sterling", "pound", "gbp", "gbpusd", "الإسترليني", "الاسترليني", "الجنيه"],
  JPY: ["yen", "jpy", "usdjpy", "الين"],
  FED: ["fed", "fomc", "federal", "powell", "الفيدرالي", "الفدرالي", "باول", "المركزي الأمريكي"],
  ECB: ["ecb", "lagarde", "لاغارد", "المركزي الأوروبي"],
  RATE: ["rate", "rates", "interest", "الفائدة", "أسعار الفائدة"],
  CUT: ["cut", "cuts", "cutting", "خفض", "يخفض", "تخفيض", "تخفض"],
  HIKE: ["hike", "hikes", "raise", "raises", "رفع", "يرفع", "ترفع"],
  OUTPUT: ["output", "production", "supply", "الإنتاج", "الانتاج", "إنتاج", "انتاج", "الإمدادات"],
  DEAL: ["agree", "agrees", "agreed", "deal", "agreement", "اتفاق", "يتفق", "تتفق", "اتفقت"],
  CPI: ["cpi", "inflation", "pce", "التضخم", "تضخم", "أسعار المستهلك"],
  JOBS: ["payrolls", "nfp", "jobs", "employment", "unemployment", "jobless", "الوظائف", "البطالة", "التوظيف"],
  GDP: ["gdp", "الناتج"],
  OPEC: ["opec", "أوبك", "اوبك"],
  STOCKS: ["stocks", "equities", "wall", "nasdaq", "dow", "الأسهم", "الاسهم", "وول", "ناسداك"],
  BTC: ["bitcoin", "btc", "بيتكوين", "البيتكوين"],
  CHINA: ["china", "chinese", "الصين", "الصيني", "الصينية"],
  WAR: ["war", "attack", "strike", "missile", "الحرب", "هجوم", "ضربة", "صاروخ"],
  TARIFF: ["tariff", "tariffs", "الرسوم", "رسوم", "التعريفات", "الجمركية"],
  RECORD: ["record", "highs", "peak", "all-time", "قياسي", "قياسية", "قمة"],
  PRICE: ["price", "prices", "أسعار", "اسعار", "سعر"],
};
const UP = ["high", "rise", "rises", "rose", "gain", "gains", "jump", "jumps", "surge", "surges", "climb", "climbs", "rally", "rallies", "up", "higher", "soar", "soars", "advance", "يرتفع", "ارتفاع", "ارتفع", "ترتفع", "ارتفعت", "صعود", "يصعد", "تصعد", "مكاسب", "يقفز", "قفزة", "يتقدم"];
const DOWN = ["low", "fall", "falls", "fell", "drop", "drops", "slip", "slips", "slide", "slides", "decline", "declines", "down", "lower", "plunge", "plunges", "sink", "sinks", "tumble", "retreat", "ينخفض", "انخفاض", "انخفض", "تنخفض", "انخفضت", "هبوط", "يهبط", "تهبط", "تراجع", "يتراجع", "تتراجع", "خسائر", "يخسر"];
const STOP_WORDS = ["the", "a", "an", "of", "to", "in", "on", "for", "and", "as", "at", "by", "with", "after", "from", "is", "are", "its", "amid", "over", "into", "says", "said", "new", "news", "update", "traders", "trader", "investors", "markets", "market", "await", "awaits", "ahead", "report", "data", "sees", "level", "levels", "hits", "hit", "above", "below", "week", "today", "before", "due", "signals", "signal", "decision",
  "في", "من", "على", "إلى", "الى", "عن", "مع", "بعد", "قبل", "أن", "ان", "إن", "هذا", "هذه", "التي", "الذي", "وسط", "خلال", "حتى", "عند", "بين", "لدى", "منذ", "قد", "ما", "لا", "كما", "أو", "او", "بسبب", "سبب", "لمستوى", "مستوى", "مستويات", "إشارة", "اشارة", "يترقب", "ترقب", "المتداولين", "المستثمرين", "الأسواق", "السوق", "تقرير", "بيانات", "اليوم", "الأسبوع", "قرار"];

function norm(w: string): string {
  return String(w)
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

const lookup = new Map<string, string>();
for (const [c, words] of Object.entries(CONCEPTS)) for (const w of words) lookup.set(norm(w), c);
for (const w of UP) lookup.set(norm(w), "↑");
for (const w of DOWN) lookup.set(norm(w), "↓");
const STOP = new Set(STOP_WORDS.map(norm));
const stripPrefix = (w: string) => w.replace(/^(?:وال|بال|لل|فال|كال|ال|و|ب|ل|ف)(?=[ء-ي]{3,})/, "");

export interface Fingerprint {
  tokens: string[];
  dir: string;
}

export function fingerprint(title = ""): Fingerprint {
  const text = norm(title).replace(/(\d)[,٬](?=\d{3}\b)/g, "$1");
  const tokens = new Set<string>();
  let dir = "";
  let rest = text;
  for (const [k, c] of lookup) {
    if (k.includes(" ") && rest.includes(k)) {
      tokens.add(c);
      rest = rest.split(k).join(" ");
    }
  }
  for (let w of rest.split(/[^\p{L}\p{N}.%]+/u)) {
    w = w.replace(/^\.+|\.+$/g, "");
    if (!w || STOP.has(w)) continue;
    if (/^\d+(?:\.\d+)?%?$/.test(w)) {
      tokens.add(`#${parseFloat(w)}`);
      continue;
    }
    const c = lookup.get(w) || lookup.get(stripPrefix(w));
    if (c === "↑" || c === "↓") {
      dir ||= c;
      continue;
    }
    if (c) {
      tokens.add(c);
      continue;
    }
    if (w.length < 3) continue;
    tokens.add(stripPrefix(w).replace(/(?:ies|es|s)$/, (m) => (w.length > 4 ? "" : m)));
  }
  return { tokens: [...tokens], dir };
}

/** تشابه بصمتين (0–1): نسبة المشترك من الأصغر. الاتجاه المعاكس أو أرقام مختلفة = خبر مختلف */
export function similarity(a: Fingerprint, b: Fingerprint): number {
  if (a.dir && b.dir && a.dir !== b.dir) return 0;
  const numsA = a.tokens.filter((t) => t.startsWith("#"));
  const numsB = b.tokens.filter((t) => t.startsWith("#"));
  if (numsA.length && numsB.length && !numsA.some((n) => numsB.includes(n))) return 0;
  const setB = new Set(b.tokens);
  const common = a.tokens.filter((t) => setB.has(t)).length;
  const min = Math.min(a.tokens.length, b.tokens.length);
  if (min < 2) return a.tokens.join() === b.tokens.join() && min > 0 ? 1 : 0;
  return common / min;
}

export const DUPLICATE_THRESHOLD = 0.7;

export function findDuplicate<T extends { fingerprint: Fingerprint | null }>(fp: Fingerprint, recent: T[]): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const r of recent) {
    if (!r.fingerprint) continue;
    const s = similarity(fp, r.fingerprint);
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  return bestScore >= DUPLICATE_THRESHOLD ? best : null;
}
