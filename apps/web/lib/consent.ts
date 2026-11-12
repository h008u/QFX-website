/**
 * موافقة الكوكيز والتتبّع (منقولة ومكيّفة من fx-partners).
 *
 * ثلاثة أشياء تحتاج إذناً قبل حدوثها لا بعده: كوكي نسب الإحالة (30 يوماً)، أدوات التحليل،
 * والويدجتات الخارجية التي ترسل بيانات الزائر لطرف ثالث. «الضروري» ليس خياراً ولا يُخزَّن:
 * جلسة الدخول، كوكيز الأمان، الوضع الفاتح/الداكن، وسجل الموافقة نفسه.
 */
export const CONSENT_COOKIE = "qfx_consent";
export const CONSENT_MAX_AGE_DAYS = 180;

export const CATEGORIES = ["analytics", "marketing", "external"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Consent = Record<Category, boolean>;

export const DENY_ALL: Consent = { analytics: false, marketing: false, external: false };
export const ALLOW_ALL: Consent = { analytics: true, marketing: true, external: true };

export const CATEGORY_INFO: Record<Category, { title: string; text: string }> = {
  analytics: { title: "التحليلات", text: "إحصاءات مجهّلة عن الصفحات الأكثر زيارة لتحسين الموقع." },
  marketing: { title: "نسب الإحالة", text: "كوكي qfx_ref لمدة 30 يوماً يحفظ رمز الشخص أو القناة التي أحالتك إلينا." },
  external: { title: "المحتوى الخارجي", text: "ويدجتات من أطراف ثالثة (مثل TradingView أو Myfxbook) قد تضع كوكيز خاصة بها." },
};

/** يُخزَّن كنص قصير مرتّب ("1-0-1") يسهل قراءته من أدوات المتصفح */
export function serialise(c: Consent): string {
  return CATEGORIES.map((k) => (c[k] ? "1" : "0")).join("-");
}

export function parse(raw: string | undefined | null): Consent | null {
  if (!raw) return null;
  const parts = raw.split("-");
  if (parts.length !== CATEGORIES.length || !parts.every((p) => p === "0" || p === "1")) return null;
  const out = { ...DENY_ALL };
  CATEGORIES.forEach((k, i) => (out[k] = parts[i] === "1"));
  return out;
}

/** قبل أن يجيب الزائر: لا شيء مسموح (المربع المحدَّد مسبقاً ليس موافقة) */
export function effective(c: Consent | null): Consent {
  return c ?? DENY_ALL;
}
