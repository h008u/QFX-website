import type { AssetClass, Direction, Impact, NewsKind, SignalStatus } from "./types";

export const DIRECTION_LABEL: Record<Direction, string> = {
  BUY: "شراء",
  SELL: "بيع",
};

export const STATUS_LABEL: Record<SignalStatus, string> = {
  pending: "معلّقة",
  open: "مفتوحة",
  tp_hit: "تحقق الهدف ✅",
  sl_hit: "ضرب الوقف ❌",
  closed: "مغلقة",
  cancelled: "ملغاة",
};

export const ASSET_LABEL: Record<AssetClass, string> = {
  forex: "العملات",
  gold: "الذهب",
  oil: "النفط",
  indices: "المؤشرات",
  crypto: "الكريبتو",
};

export const NEWS_KIND_LABEL: Record<NewsKind, string> = {
  news: "خبر",
  analysis: "تحليل فني",
  calendar: "المفكرة الاقتصادية",
  announcement: "إعلان",
};

export const IMPACT_LABEL: Record<Impact, string> = {
  low: "تأثير منخفض",
  medium: "تأثير متوسط",
  high: "تأثير مرتفع",
};

export const IMPACT_ICON: Record<Impact, string> = {
  low: "🟡",
  medium: "🟠",
  high: "🔴",
};

export const CURRENCY_LABEL: Record<string, string> = {
  USD: "🇺🇸 الدولار الأمريكي",
  EUR: "🇪🇺 اليورو",
  GBP: "🇬🇧 الجنيه الإسترليني",
  JPY: "🇯🇵 الين الياباني",
  CHF: "🇨🇭 الفرنك السويسري",
  CAD: "🇨🇦 الدولار الكندي",
  AUD: "🇦🇺 الدولار الأسترالي",
  NZD: "🇳🇿 الدولار النيوزيلندي",
  CNY: "🇨🇳 اليوان الصيني",
};

/** الحالات التي تعتبر الصفقة فيها منتهية */
export const CLOSED_STATUSES: SignalStatus[] = ["tp_hit", "sl_hit", "closed", "cancelled"];
