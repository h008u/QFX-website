/**
 * محتوى الموقع القابل للتعديل من لوحة التحكم أو مباشرة على الصفحة:
 * ترتيب أقسام الرئيسية وإظهارها، كل النصوص، عناصر «لماذا QFX»، الخطوات، الأسئلة الشائعة، وشريط الإعلان.
 * (ملف مشترك بين الخادم والمتصفح — بدون أسرار)
 */

export type HomeSectionId = "hero" | "market" | "ideas" | "news" | "why" | "broker" | "steps" | "join";

export const HOME_SECTION_LABEL: Record<HomeSectionId, string> = {
  hero: "الواجهة الرئيسية (البطل)",
  market: "ملخص السوق والشارت",
  ideas: "أحدث التوصيات",
  news: "الأخبار وقناة تيليجرام",
  why: "لماذا QFX",
  broker: "الوسيط الشريك",
  steps: "خطوات الانضمام",
  join: "نموذج الانضمام",
};

export interface HomeSection {
  id: HomeSectionId;
  visible: boolean;
}

export interface TextItem {
  title: string;
  text: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface SiteContent {
  sections: HomeSection[];
  /** نصوص مفردة بمفاتيح ثابتة (انظر TEXT_FIELDS) */
  texts: Record<string, string>;
  why: TextItem[];
  steps: TextItem[];
  faqs: Faq[];
  announcement: { visible: boolean; text: string; href: string };
}

/** كل النصوص القابلة للتعديل: المفتاح ← [الوصف، القيمة الافتراضية، أقصى طول] */
export const TEXT_FIELDS: Record<string, [string, string, number]> = {
  "hero.title1": ["عنوان البطل — السطر الأول", "حلّل أولاً.", 60],
  "hero.title2": ["عنوان البطل — السطر الملوّن", "ثم تداول بثقة.", 60],
  "hero.subtitle": [
    "الوصف تحت العنوان",
    "انضم إلى مجتمع QFX للتداول: حساب لدى وسيط مرخّص عبر وكالتنا، توصيات يومية بسجل أداء شفاف، تحليلات فنية، وأخبار المفكرة الاقتصادية بالعربية.",
    300,
  ],
  "hero.search": ["نص مربع البحث", "ابحث عن سوق — الذهب، EURUSD، بيتكوين...", 80],
  "hero.cta1": ["الزر الأساسي", "افتح حسابك عبر الوكالة", 40],
  "hero.cta2": ["الزر الثانوي", "سجل التوصيات", 40],
  "hero.stat1": ["إحصائية 1", "نسبة نجاح التوصيات", 40],
  "hero.stat2": ["إحصائية 2", "مجموع النقاط", 40],
  "hero.stat3": ["إحصائية 3", "توصية منشورة", 40],
  "market.title": ["عنوان ملخص السوق", "ملخص السوق", 60],
  "ideas.title": ["عنوان التوصيات", "أحدث التوصيات", 60],
  "news.title": ["عنوان الأخبار", "أهم الأخبار والتحليلات", 60],
  "telegram.title": ["بطاقة تيليجرام — العنوان", "التوصيات والأخبار القوية تصلك على تيليجرام فور صدورها", 120],
  "telegram.text": ["بطاقة تيليجرام — الوصف", "تنبيه قبل الخبر الاقتصادي القوي، وأجندة يومية، وتحديثات الصفقات كرد على رسالتها.", 240],
  "telegram.cta": ["بطاقة تيليجرام — الزر", "انضم للقناة", 40],
  "why.title": ["عنوان «لماذا»", "لماذا تتداول عبر QFX؟", 60],
  "broker.kicker": ["الوسيط — العنوان الصغير", "شريكنا في الوساطة", 60],
  "broker.cta": ["الوسيط — الزر", "التسجيل عبر رابط الوكالة", 40],
  "broker.text": [
    "الوسيط — الشرح",
    "نحن وكيل معرّف: نعرّفك على الوسيط ونرافقك بالدعم والتعليم والتوصيات، بينما يتولى الوسيط المرخّص حفظ الأموال وتنفيذ الصفقات. لا نطلب منك أبداً إرسال أموال إلينا.",
    400,
  ],
  "steps.title": ["عنوان الخطوات", "انضم في أربع خطوات", 60],
  "join.title": ["الانضمام — العنوان", "جاهز للانضمام؟", 60],
  "join.text": ["الانضمام — الوصف", "سجّل حسابك عبر رابط الوكالة، ثم أرسل بياناتك لنفعّل اشتراكك في قناة العملاء.", 240],
  "join.cta": ["الانضمام — الزر", "1. افتح الحساب", 40],
  "join.formTitle": ["الانضمام — عنوان النموذج", "2. أرسل بيانات التفعيل", 60],
  "footer.about": [
    "التذييل — نبذة",
    "وكيل معرّف (Introducing Broker) يربط المتداولين العرب بشركات وساطة مرخّصة، مع شارتات وتوصيات وتحليلات ومجتمع تداول بالعربية.",
    300,
  ],
};

export const DEFAULT_CONTENT: SiteContent = {
  sections: (Object.keys(HOME_SECTION_LABEL) as HomeSectionId[]).map((id) => ({ id, visible: true })),
  texts: Object.fromEntries(Object.entries(TEXT_FIELDS).map(([k, [, v]]) => [k, v])),
  why: [
    { title: "وسطاء مرخّصون", text: "حسابك وأموالك لدى شركة وساطة خاضعة للرقابة، ونحن نرافقك بالدعم والمحتوى." },
    { title: "مزايا لعملاء الوكالة", text: "شروط تداول تنافسية واسترداد جزء من العمولات حسب حجم تداولك." },
    { title: "توصيات بسجل حقيقي", text: "كل صفقة مسجّلة بالدخول والوقف والأهداف ونتيجتها — رابحة كانت أو خاسرة." },
    { title: "مجتمع عربي", text: "تحليلات يومية ونقاش منظم حول الذهب والعملات والنفط." },
  ],
  steps: [
    { title: "سجّل عبر رابط الإحالة", text: "افتح حساب تداول حقيقي لدى الوسيط المرخّص الشريك من خلال رابطنا، ليُربط حسابك بوكالتنا تلقائياً." },
    { title: "وثّق حسابك وموّله", text: "أكمل التحقق من الهوية لدى الوسيط مباشرة، ثم أودع بالطريقة التي تناسبك. أموالك تبقى دائماً لدى الوسيط." },
    { title: "أرسل بياناتك للتفعيل", text: "املأ نموذج الانضمام برقم حسابك ليتحقق فريقنا من ارتباطه بالوكالة خلال 24 ساعة." },
    { title: "استقبل التوصيات والدعم", text: "نضيفك لقناة العملاء على تيليجرام لتصلك التوصيات والتحليلات وتنبيهات الأخبار المهمة فور صدورها." },
  ],
  faqs: [
    { q: "ما هو الوكيل المعرّف (IB)؟", a: "الوكيل المعرّف هو جهة تُعرّف العملاء على شركة وساطة مرخّصة وتقدّم لهم خدمات إضافية مثل الدعم والتعليم والتحليلات. يحصل الوكيل على عمولة من الوسيط مقابل ذلك، دون أي تكلفة إضافية عليك." },
    { q: "هل أرسل أموالي إليكم؟", a: "لا أبداً. الإيداع والسحب يتمّان مباشرة بينك وبين شركة الوساطة. لا نطلب كلمات المرور ولا نستلم أي أموال." },
    { q: "لدي حساب مسبق لدى الوسيط، هل أستطيع الانضمام؟", a: "بعض الوسطاء يسمحون بنقل الحساب إلى وكالة جديدة عبر طلب للدعم. تواصل معنا وسنساعدك، أو افتح حساباً جديداً عبر رابطنا." },
    { q: "هل التوصيات مضمونة الربح؟", a: "لا. لا توجد توصيات مضمونة في الأسواق المالية. ننشر سجلاً كاملاً بالنتائج الرابحة والخاسرة لتقييم الأداء بنفسك، وننصح دائماً بإدارة رأس المال وعدم المخاطرة بأكثر من 1-2% في الصفقة." },
    { q: "كيف تصلني التوصيات؟", a: "تُنشر التوصية في قناة تيليجرام وعلى صفحة التوصيات في الموقع في نفس اللحظة، مع تحديث تلقائي عند تحقق الهدف أو ضرب الوقف." },
    { q: "ما هو نسخ التداول؟", a: "بعض الوسطاء يتيحون ربط حسابك بحساب استراتيجية لنسخ الصفقات تلقائياً. يتم ذلك عبر منصة الوسيط نفسها ويمكنك إيقافه في أي وقت." },
  ],
  announcement: { visible: false, text: "🎉 عرض خاص: استرداد عمولات مضاعف لعملاء الوكالة الجدد هذا الشهر", href: "/#join" },
};

const LIMITS = { items: 12, faqs: 30, itemTitle: 80, itemText: 400, q: 200, a: 1200, announce: 200, href: 300 };

const str = (v: unknown, max: number, fallback = "") =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max) : fallback;

const safeHref = (v: unknown) => {
  const s = str(v, LIMITS.href);
  return /^(https?:\/\/|\/|#)/.test(s) ? s : "";
};

/** يدمج المحفوظ مع الافتراضي وينظّف كل القيم (يُستخدم عند القراءة وعند الحفظ) */
export function normalizeContent(raw: unknown): SiteContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<SiteContent>;
  const ids = Object.keys(HOME_SECTION_LABEL) as HomeSectionId[];
  const seen = new Set<string>();
  const sections: HomeSection[] = [];
  for (const s of Array.isArray(r.sections) ? r.sections : []) {
    if (s && ids.includes(s.id) && !seen.has(s.id)) {
      seen.add(s.id);
      sections.push({ id: s.id, visible: s.visible !== false });
    }
  }
  for (const id of ids) if (!seen.has(id)) sections.push({ id, visible: true }); // أقسام جديدة تُضاف بآخر الصفحة
  const texts: Record<string, string> = {};
  const rt = (r.texts && typeof r.texts === "object" ? r.texts : {}) as Record<string, unknown>;
  for (const [k, [, def, max]] of Object.entries(TEXT_FIELDS)) texts[k] = str(rt[k], max) || def;
  const items = (v: unknown, def: TextItem[]) =>
    Array.isArray(v)
      ? v.slice(0, LIMITS.items).map((x) => ({ title: str(x?.title, LIMITS.itemTitle), text: str(x?.text, LIMITS.itemText) })).filter((x) => x.title)
      : def;
  const faqs = Array.isArray(r.faqs)
    ? r.faqs.slice(0, LIMITS.faqs).map((f) => ({ q: str(f?.q, LIMITS.q), a: str(f?.a, LIMITS.a) })).filter((f) => f.q && f.a)
    : DEFAULT_CONTENT.faqs;
  const a = (r.announcement ?? {}) as Partial<SiteContent["announcement"]>;
  return {
    sections,
    texts,
    why: items(r.why, DEFAULT_CONTENT.why),
    steps: items(r.steps, DEFAULT_CONTENT.steps),
    faqs,
    announcement: {
      visible: a.visible === true,
      text: str(a.text, LIMITS.announce) || DEFAULT_CONTENT.announcement.text,
      href: a.href === undefined ? DEFAULT_CONTENT.announcement.href : safeHref(a.href),
    },
  };
}
