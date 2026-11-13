import { SENTRY_DSN, sentryOptions } from "@/lib/sentry-options";

// أخطاء المتصفح — تُحمّل مكتبة Sentry فقط إذا ضُبط المفتاح (لا تُثقل الموقع بلا داعٍ)،
// بلا تسجيل جلسات (Replay) وبلا بيانات شخصية
if (SENTRY_DSN) {
  import("@sentry/nextjs").then((Sentry) => Sentry.init({ ...sentryOptions(), integrations: [] }));
}
