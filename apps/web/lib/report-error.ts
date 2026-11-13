import { SENTRY_DSN } from "./sentry-options";

/** يبلّغ Sentry عن خطأ من المتصفح — تحميل كسول، ولا شيء إذا لم تُفعّل المراقبة */
export function reportError(error: unknown) {
  if (!SENTRY_DSN) return;
  import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {});
}
