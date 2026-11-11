// أنواع الأخبار وتصنيفها بالكلمات المفتاحية (منقول من Spir-Telegrambot)
// الكلمات الإنكليزية تنطابق ككلمة كاملة، والعربية كجزء من الكلمة (حتى تشمل "ال" و"بال"...)

export interface NewsCategory {
  id: string;
  label: string;
  tag: string;
  on: boolean;
  en: string[];
  ar: string[];
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  {
    id: "central", label: "🏦 البنوك المركزية والفائدة", tag: "#البنوك_المركزية", on: true,
    en: ["fed", "fomc", "powell", "ecb", "lagarde", "boe", "bailey", "boj", "ueda", "snb", "rba", "boc", "rbnz",
      "central bank", "rate decision", "interest rate", "interest rates", "rate hike", "rate cut", "rate cuts",
      "hawkish", "dovish", "monetary policy", "treasury yields", "yields"],
    ar: ["الفيدرالي", "الفدرالي", "المركزي", "الفائدة", "باول", "لاغارد", "السياسة النقدية", "عوائد السندات"],
  },
  {
    id: "data", label: "📊 البيانات الاقتصادية", tag: "#بيانات_اقتصادية", on: true,
    en: ["cpi", "ppi", "pce", "inflation", "nfp", "nonfarm", "non-farm", "payrolls", "jobless", "unemployment",
      "jobs report", "gdp", "retail sales", "pmi", "ism", "consumer confidence", "durable goods", "trade balance", "recession"],
    ar: ["التضخم", "الوظائف", "البطالة", "الناتج المحلي", "مبيعات التجزئة", "مديري المشتريات", "أسعار المستهلكين", "الركود"],
  },
  {
    id: "gold", label: "🥇 الذهب والمعادن", tag: "#الذهب", on: true,
    en: ["gold", "xau", "xauusd", "silver", "xag", "xagusd", "precious metals", "bullion"],
    ar: ["الذهب", "الفضة", "المعادن"],
  },
  {
    id: "oil", label: "🛢 النفط والطاقة", tag: "#النفط", on: true,
    en: ["oil", "crude", "brent", "wti", "opec", "opec+", "natural gas"],
    ar: ["النفط", "الخام", "برنت", "أوبك", "الغاز الطبيعي"],
  },
  {
    id: "forex", label: "💱 العملات", tag: "#العملات", on: true,
    en: ["dollar", "usd", "eur", "euro", "gbp", "sterling", "pound", "jpy", "yen", "chf", "swiss franc", "aud", "cad",
      "loonie", "nzd", "kiwi", "eurusd", "gbpusd", "usdjpy", "audusd", "usdcad", "usdchf", "dxy", "forex", "fx"],
    ar: ["الدولار", "اليورو", "الإسترليني", "الاسترليني", "الجنيه", "الين", "الفرنك", "العملات"],
  },
  {
    id: "geo", label: "🌍 جيوسياسة وأخبار عاجلة", tag: "#عاجل", on: true,
    en: ["breaking", "urgent", "war", "sanctions", "tariff", "tariffs", "trade war", "election", "ceasefire", "missile", "invasion"],
    ar: ["عاجل", "الحرب", "عقوبات", "الرسوم الجمركية", "الانتخابات", "وقف إطلاق النار", "صواريخ"],
  },
  {
    id: "stocks", label: "📈 الأسهم والمؤشرات", tag: "#الأسهم", on: false,
    en: ["stocks", "equities", "s&p", "s&p 500", "nasdaq", "dow", "dow jones", "wall street", "earnings", "nikkei", "dax", "ftse"],
    ar: ["الأسهم", "المؤشرات", "وول ستريت", "ناسداك", "داو جونز", "أرباح الشركات"],
  },
  {
    id: "crypto", label: "₿ العملات الرقمية", tag: "#كريبتو", on: false,
    en: ["bitcoin", "btc", "crypto", "cryptocurrency", "ethereum", "eth", "stablecoin"],
    ar: ["بيتكوين", "البيتكوين", "العملات الرقمية", "العملات المشفرة", "الكريبتو", "إيثريوم"],
  },
];

export const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** يبني دالة مطابقة: إنكليزي ككلمة كاملة، عربي كجزء من الكلمة */
export const wordMatcher = (en: string[], ar: string[]) => {
  const re = en.length ? new RegExp(`(^|[^a-z0-9])(${en.map(escapeRe).join("|")})(?=[^a-z0-9]|$)`, "i") : null;
  return (t: string) => (re?.test(t) ?? false) || ar.some((w) => t.includes(w));
};

const MATCHERS = NEWS_CATEGORIES.map((c) => ({ id: c.id, test: wordMatcher(c.en, c.ar) }));

/** يرجع أنواع الخبر حسب الكلمات بالعنوان والملخص */
export function categorize(text = ""): string[] {
  const t = text.toLowerCase();
  return MATCHERS.filter((m) => m.test(t)).map((m) => m.id);
}

export const categoryTags = (ids: string[]) =>
  ids.map((id) => NEWS_CATEGORIES.find((c) => c.id === id)?.tag).filter(Boolean) as string[];
