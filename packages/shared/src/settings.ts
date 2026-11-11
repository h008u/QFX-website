// إعدادات البوت المحفوظة في جدول settings (مفتاح لكل قسم). اللوحة تعدّلها والبوت يقرأها كل دورة.
import { DEFAULT_POST_TEMPLATES, type PostTemplate } from "./markup";

export type PostKind =
  | "manual" | "news" | "agenda" | "event_alert" | "event_result" | "tradingview" | "signal"
  | "greeting" | "weekly" | "outlook" | "price_alert";

export type PostStatus =
  | "draft" | "pending" | "scheduled" | "publishing" | "published" | "partial" | "failed" | "rejected" | "filtered" | "duplicate";

export const POST_KIND_LABEL: Record<PostKind, string> = {
  manual: "منشوراتك",
  news: "الأخبار",
  agenda: "أجندة اليوم",
  event_alert: "تنبيه قبل الخبر",
  event_result: "نتيجة الخبر",
  tradingview: "تنبيهات TradingView",
  signal: "التوصيات",
  greeting: "التحيات",
  weekly: "ملخص الأسبوع والاستطلاع",
  outlook: "نظرة الأسبوع",
  price_alert: "تنبيهات الأسعار",
};

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  draft: "مسودة",
  pending: "ينتظر الموافقة",
  scheduled: "مجدول",
  publishing: "يُنشر الآن",
  published: "نُشر",
  partial: "نُشر جزئياً",
  failed: "فشل",
  rejected: "مرفوض",
  filtered: "انفلتر",
  duplicate: "مكرر",
};

/** مكان نشر: قناة أو مجموعة أو موضوع داخل مجموعة */
export interface Destination {
  id: string;
  chat_id: string; // @channel أو -100...
  thread_id?: number | null;
  label: string;
  kinds: PostKind[] | "all";
  enabled: boolean;
}

export type PolicyMode = "auto" | "approval" | "score";
export interface PolicyRule {
  mode: PolicyMode;
  auto: number; // فوق هذا الحد ينشر تلقائياً
  approve: number; // بين الحدين ينتظر الموافقة، وتحته يُحجب
}
export const POLICY_KINDS = {
  news: "الأخبار",
  tradingview: "تنبيهات TradingView",
  agenda: "الأجندة وتنبيهات الأخبار",
  price_alert: "تنبيهات الأسعار",
} as const;
export type PolicyKind = keyof typeof POLICY_KINDS;
export const POLICY_MODE_LABEL: Record<PolicyMode, string> = { auto: "تلقائي", approval: "بموافقتك", score: "حسب الأهمية" };

export interface BotSettings {
  general: {
    timezone: string;
    paused: boolean; // إيقاف النشر التلقائي مؤقتاً
    signature: string; // سطر بآخر كل منشور
    disclaimer: string; // تحذير المنشورات التحليلية
  };
  destinations: Destination[];
  policy: Record<PolicyKind, PolicyRule>;
  rules: {
    banned: string[]; // الخبر ما ينزل
    required: string[]; // لازم تكون بالخبر (إذا القائمة مو فارغة)
    watch: string[]; // يوصلك بالخاص حتى لو انفلتر
    quiet: { enabled: boolean; start: string; end: string; allowBreaking: boolean };
  };
  news: {
    enabled: boolean;
    translate: boolean;
    interval_min: number;
    max_per_run: number;
    sources: Record<string, boolean>;
    custom_feeds: { id: string; label: string; url: string; on: boolean }[];
    categories: Record<string, boolean>;
    focus: string[];
    show_tags: boolean;
    show_source: boolean;
  };
  calendar: {
    currencies: string[];
    min_impact: "high" | "medium";
    agenda_enabled: boolean;
    agenda_time: string; // HH:MM (أيام العمل)
    pre_alert_enabled: boolean;
    pre_alert_min: number;
    explain: boolean; // شرح القراءة المعتادة قبل الخبر
  };
  greetings: {
    morning: { enabled: boolean; time: string; weekdays_only: boolean };
    open: { enabled: boolean; day: number; time: string }; // 0 = الأحد
    close: { enabled: boolean; day: number; time: string };
    captions: Record<"morning" | "open" | "close", string[]>;
    images: Record<"morning" | "open" | "close", string[]>;
  };
  weekly: {
    enabled: boolean;
    day: number;
    time: string;
    poll: { enabled: boolean; symbol: string; name: string };
  };
  tradingview: { enabled: boolean };
  templates: PostTemplate[];
  holidays: { date: string; name: string }[]; // MM-DD
}

export const DEFAULT_SETTINGS: BotSettings = {
  general: {
    timezone: "Asia/Riyadh",
    paused: false,
    signature: "",
    disclaimer: "⚠️ ليس توصية مالية، التزم بإدارة رأس المال.",
  },
  destinations: [],
  policy: {
    news: { mode: "score", auto: 70, approve: 40 },
    tradingview: { mode: "auto", auto: 70, approve: 40 },
    agenda: { mode: "auto", auto: 70, approve: 40 },
    price_alert: { mode: "auto", auto: 70, approve: 40 },
  },
  rules: {
    banned: ["sponsored", "إعلان"],
    required: [],
    watch: [],
    quiet: { enabled: false, start: "00:00", end: "07:00", allowBreaking: true },
  },
  news: {
    enabled: true,
    translate: true,
    interval_min: 10,
    max_per_run: 4,
    sources: {},
    custom_feeds: [],
    categories: {},
    focus: ["gold", "usd", "forex"],
    show_tags: true,
    show_source: true,
  },
  calendar: {
    currencies: ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"],
    min_impact: "high",
    agenda_enabled: true,
    agenda_time: "08:00",
    pre_alert_enabled: true,
    pre_alert_min: 15,
    explain: true,
  },
  greetings: {
    morning: { enabled: true, time: "07:00", weekdays_only: true },
    open: { enabled: true, day: 0, time: "23:30" },
    close: { enabled: true, day: 5, time: "23:30" },
    captions: {
      morning: [
        "☀️ صباح الخير متداولينا الأعزاء\nنتمنى لكم يوماً موفقاً وصفقات رابحة 📈",
        "☀️ صباح الخير\nيوم تداول جديد، خططوا لصفقاتكم والتزموا بإدارة المخاطر 💪",
        "🌅 صباح النور والتوفيق\nانتبهوا لأجندة الأخبار القوية اليوم، وتداولاً موفقاً للجميع 📊",
        "☕ صباح الخير يا متداولين\nالصبر والانضباط نصف الربح، يوماً موفقاً 📈",
      ],
      open: [
        "🔔 افتتاح الأسواق\nبداية أسبوع تداول جديد، نتمنى لكم التوفيق 💹",
        "🔔 الأسواق فتحت\nأسبوع جديد وفرص جديدة، لا تنسوا خطة التداول ووقف الخسارة 🎯",
        "🚀 افتتاح أسبوع التداول\nانتبهوا لفجوات الافتتاح، وتداولاً موفقاً للجميع 📊",
      ],
      close: [
        "🔕 إغلاق الأسواق\nانتهى أسبوع التداول، عطلة سعيدة ونلتقي الأسبوع القادم 🌙",
        "🔕 الأسواق أغلقت\nراجعوا صفقات الأسبوع واستريحوا، نعود إليكم مع الافتتاح 🌙",
        "🌙 نهاية أسبوع التداول\nشكراً لمتابعتكم، عطلة سعيدة وأسبوع قادم أفضل ✨",
      ],
    },
    images: { morning: [], open: [], close: [] },
  },
  weekly: {
    enabled: true,
    day: 5,
    time: "23:00",
    poll: { enabled: true, symbol: "XAUUSD", name: "الذهب" },
  },
  tradingview: { enabled: true },
  templates: DEFAULT_POST_TEMPLATES,
  holidays: [
    { date: "12-25", name: "عيد الميلاد" },
    { date: "01-01", name: "رأس السنة" },
  ],
};

export type SettingsKey = keyof BotSettings;
export const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingsKey[];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** دمج عميق: القيم المحفوظة فوق الافتراضية، والمصفوفات تُستبدل كما هي */
export function deepMerge<T>(base: T, override: unknown): T {
  if (!isObj(base) || !isObj(override)) return (override === undefined ? base : (override as T));
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    out[k] = k in out && isObj(out[k]) && isObj(v) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

/** يبني الإعدادات الكاملة من صفوف الجدول */
export function mergeSettings(rows: { key: string; value: unknown }[]): BotSettings {
  const out = structuredClone(DEFAULT_SETTINGS);
  for (const r of rows) {
    if ((SETTINGS_KEYS as string[]).includes(r.key)) {
      (out as unknown as Record<string, unknown>)[r.key] = deepMerge(
        (out as unknown as Record<string, unknown>)[r.key],
        r.value,
      );
    }
  }
  return out;
}

/** هل مكان النشر يستقبل هذا النوع؟ */
export const destinationAccepts = (d: Destination, kind: PostKind) =>
  d.enabled && (d.kinds === "all" || d.kinds.includes(kind));

/** قرار سياسة النشر لعنصر آلي */
export function decidePolicy(rule: PolicyRule, score: number): "auto" | "pending" | "blocked" {
  if (rule.mode === "auto") return "auto";
  if (rule.mode === "approval") return "pending";
  if (score >= rule.auto) return "auto";
  if (score >= rule.approve) return "pending";
  return "blocked";
}

/** فحص الكلمات الممنوعة/المطلوبة/المراقبة */
export function checkRules(text: string, rules: BotSettings["rules"]) {
  const t = text.toLowerCase();
  const has = (w: string) => w.trim() && t.includes(w.trim().toLowerCase());
  const banned = rules.banned.find(has) ?? null;
  const missingRequired = rules.required.filter((w) => w.trim()).length > 0 && !rules.required.some(has);
  const watched = rules.watch.filter(has);
  return { banned, missingRequired, watched };
}
