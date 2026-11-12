/** ثيمات واجهة الموقع — تُختار من لوحة التحكم (الإعدادات ← المظهر) */
export type SiteThemeId = "institutional" | "classic" | "terminal" | "neon" | "luxe";

export interface SiteThemeMeta {
  id: SiteThemeId;
  name: string;
  tagline: string;
  /** both = فاتح + داكن بزر تبديل، dark = داكن دائماً */
  mode: "both" | "dark";
  /** ألوان للمعاينة في لوحة التحكم: خلفية، نص، أساسي، تمييز */
  swatch: [string, string, string, string];
  fonts: string;
}

export const DEFAULT_THEME: SiteThemeId = "institutional";

export const SITE_THEMES: SiteThemeMeta[] = [
  {
    id: "institutional",
    name: "المؤسسي",
    tagline: "فاتح ورصين بالكحلي والذهبي — يبني الثقة كبيت أبحاث مالية",
    mode: "both",
    swatch: ["#FAFAF7", "#14213D", "#0A1F44", "#B8912F"],
    fonts: "Noto Kufi Arabic + IBM Plex Mono",
  },
  {
    id: "classic",
    name: "الكلاسيكي",
    tagline: "أسلوب منصات الشارتات: أبيض نظيف وأزرق وأزرار دائرية",
    mode: "both",
    swatch: ["#FFFFFF", "#131722", "#2962FF", "#089981"],
    fonts: "IBM Plex Sans Arabic",
  },
  {
    id: "terminal",
    name: "الطرفية الاحترافية",
    tagline: "داكن كثيف بالبيانات بلمسة كهرمانية وأرقام أحادية المسافة",
    mode: "dark",
    swatch: ["#07090D", "#C9D1D9", "#F5A524", "#00C176"],
    fonts: "IBM Plex Sans Arabic + JetBrains Mono",
  },
  {
    id: "neon",
    name: "النيون الزجاجي",
    tagline: "طبقات زجاجية وإضاءات بنفسجية وزرقاء — عصري وجذّاب",
    mode: "dark",
    swatch: ["#060816", "#E6EAF5", "#5B6CFF", "#22D3EE"],
    fonts: "Readex Pro + Space Grotesk",
  },
  {
    id: "luxe",
    name: "الذهبي الفاخر",
    tagline: "أسود وذهبي لنادٍ خاص — مثالي للتركيز على الذهب وخدمة VIP",
    mode: "dark",
    swatch: ["#0A0907", "#EDE6D6", "#D4AF37", "#4CC38A"],
    fonts: "El Messiri + Tajawal + Cormorant",
  },
];

export const THEME_IDS = SITE_THEMES.map((t) => t.id);
export const DARK_ONLY_THEMES = SITE_THEMES.filter((t) => t.mode === "dark").map((t) => t.id);
export const isThemeId = (v: unknown): v is SiteThemeId => typeof v === "string" && (THEME_IDS as string[]).includes(v);
