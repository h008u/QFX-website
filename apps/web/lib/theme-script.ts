export const THEME_KEY = "qfx-theme";

/**
 * يُنفّذ قبل رسم الصفحة لتجنّب الوميض: الوضع الفاتح افتراضي، والداكن فقط إذا اختاره المستخدم.
 * (نص ثابت بدون مدخلات خارجية)
 */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
