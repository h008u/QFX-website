// تقييم الخبر (0–100): شكد يهم المتداول، مع تركيز على الأسواق المختارة (منقول من Spir-Telegrambot)
import { wordMatcher } from "./categories";

export const MARKETS: Record<string, { label: string; test: (t: string) => boolean }> = {
  gold: { label: "🥇 الذهب", test: wordMatcher(["gold", "xau", "xauusd", "bullion", "precious metal", "precious metals", "silver", "xag"], ["الذهب", "المعدن الأصفر", "المعادن النفيسة", "الفضة", "المعادن الثمينة"]) },
  oil: { label: "🛢 النفط", test: wordMatcher(["oil", "crude", "brent", "wti", "opec", "opec+", "oilfield", "refinery", "barrels", "petroleum"], ["النفط", "الخام", "برنت", "أوبك", "البترول", "برميل", "المصافي"]) },
  usd: { label: "💵 الدولار", test: wordMatcher(["dollar", "usd", "dxy", "greenback", "treasury", "treasuries"], ["الدولار", "سندات الخزانة", "الخزانة الأمريكية"]) },
  forex: { label: "💱 العملات", test: wordMatcher(["eur", "euro", "gbp", "sterling", "pound", "yen", "jpy", "franc", "aud", "cad", "forex", "eurusd", "gbpusd", "usdjpy"], ["اليورو", "الإسترليني", "الاسترليني", "الين", "الفرنك", "العملات"]) },
  stocks: { label: "📈 الأسهم", test: wordMatcher(["stocks", "equities", "s&p", "nasdaq", "dow", "wall street", "earnings"], ["الأسهم", "وول ستريت", "ناسداك", "داو جونز"]) },
  crypto: { label: "₿ الرقمية", test: wordMatcher(["bitcoin", "btc", "crypto", "ethereum"], ["بيتكوين", "البيتكوين", "العملات الرقمية", "العملات المشفرة"]) },
};
export const DEFAULT_FOCUS = ["gold", "usd", "forex"];

const DRIVERS = [
  { id: "rates", label: "الفائدة والبنوك المركزية", w: 22, test: wordMatcher(["fed", "fomc", "powell", "rate decision", "rate cut", "rate cuts", "rate hike", "interest rate", "interest rates", "hawkish", "dovish", "ecb", "boe", "boj"], ["الفيدرالي", "الفدرالي", "الفائدة", "باول", "البنك المركزي"]) },
  { id: "inflation", label: "التضخم والوظائف", w: 18, test: wordMatcher(["cpi", "ppi", "pce", "inflation", "nfp", "nonfarm", "non-farm", "payrolls", "jobs report", "unemployment", "gdp", "recession"], ["التضخم", "الوظائف", "البطالة", "الناتج المحلي", "الركود"]) },
  { id: "geo", label: "جيوسياسة", w: 18, test: wordMatcher(["war", "attack", "missile", "strike", "sanctions", "invasion", "ceasefire", "iran", "israel", "russia", "ukraine", "red sea", "middle east", "tariff", "tariffs"], ["الحرب", "هجوم", "صواريخ", "عقوبات", "إيران", "روسيا", "أوكرانيا", "البحر الأحمر", "الشرق الأوسط", "الرسوم الجمركية", "وقف إطلاق النار"]) },
  { id: "supply", label: "العرض والمخزون", w: 16, test: wordMatcher(["opec+", "output", "production cut", "production cuts", "supply", "inventories", "stockpiles", "eia", "rig count", "central bank buying", "etf holdings", "reserves"], ["الإنتاج", "خفض الإنتاج", "المخزونات", "الإمدادات", "الاحتياطي", "مشتريات البنوك المركزية"]) },
  { id: "move", label: "حركة سعر قوية", w: 14, test: wordMatcher(["record", "all-time high", "surge", "surges", "soar", "soars", "plunge", "plunges", "tumble", "tumbles", "jump", "jumps", "slump", "rally", "crash", "spike"], ["قياسي", "أعلى مستوى", "أدنى مستوى", "يقفز", "تقفز", "يهبط", "تهبط", "ينهار", "ارتفاع حاد", "انخفاض حاد"]) },
  { id: "breaking", label: "عاجل", w: 15, test: wordMatcher(["breaking", "urgent", "flash", "just in", "alert"], ["عاجل", "خبر عاجل"]) },
];
export const DRIVER_LABELS = Object.fromEntries(DRIVERS.map((d) => [d.id, d.label]));

const NOISE = wordMatcher(["opinion", "sponsored", "webinar", "podcast", "how to", "top 5", "top 10", "explained", "review"], ["برعاية", "إعلان", "ندوة", "كيف ت"]);

export interface NewsScore {
  score: number;
  level: "high" | "mid" | "low";
  markets: string[];
  focus: string[];
  drivers: string[];
}

export function scoreNews(text = "", focus: string[] = DEFAULT_FOCUS): NewsScore {
  const t = String(text).toLowerCase();
  const markets = Object.keys(MARKETS).filter((m) => MARKETS[m].test(t));
  const hitFocus = markets.filter((m) => focus.includes(m));
  const drivers = DRIVERS.filter((d) => d.test(t));
  let score = 20;
  if (hitFocus.length) score += 30;
  else if (markets.length) score += 10;
  score += Math.min(45, drivers.reduce((a, d) => a + d.w, 0));
  if (hitFocus.length && drivers.length) score += 5;
  if (NOISE(t)) score -= 25;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, level: score >= 70 ? "high" : score >= 45 ? "mid" : "low", markets, focus: hitFocus, drivers: drivers.map((d) => d.id) };
}

/** أهمية حدث المفكرة */
export const impactScore = (impact: string | null | undefined) => (impact === "high" ? 85 : impact === "medium" ? 55 : 25);
