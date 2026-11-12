import { DARK_ONLY_THEMES, THEME_IDS } from "@/config/themes";

export const THEME_KEY = "qfx-theme";
export const PREVIEW_KEY = "qfx-preview-theme";

/**
 * يُنفّذ قبل رسم الصفحة لتجنّب الوميض:
 *  - ?theme=<id> يفعّل معاينة ثيم لهذه الجلسة فقط (و ?theme=reset يلغيها)
 *  - لوحة الإدارة تبقى على الثيم المؤسسي دائماً (مع زر الفاتح/الداكن)
 *  - الثيمات الداكنة دائماً تضيف .dark، والبقية فاتحة إلا إذا اختار الزائر الداكن
 * (نص ثابت مبني من قوائم داخلية فقط)
 */
export const THEME_INIT_SCRIPT = `try{var d=document.documentElement,T=${JSON.stringify(THEME_IDS)},K=${JSON.stringify(DARK_ONLY_THEMES)},q=new URLSearchParams(location.search).get("theme");
if(q==="reset")sessionStorage.removeItem("${PREVIEW_KEY}");else if(q&&T.indexOf(q)>-1)sessionStorage.setItem("${PREVIEW_KEY}",q);
var p=sessionStorage.getItem("${PREVIEW_KEY}");if(p&&T.indexOf(p)>-1)d.setAttribute("data-theme",p);
if(location.pathname.indexOf("/admin")===0)d.setAttribute("data-theme","institutional");
var t=d.getAttribute("data-theme");if(K.indexOf(t)>-1||localStorage.getItem("${THEME_KEY}")==="dark")d.classList.add("dark")}catch(e){}`;
