import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, sentryOptions } from "@/lib/sentry-options";

/** يبدأ مراقبة الأخطاء على الخادم (Node و Edge) — فقط إذا ضُبط NEXT_PUBLIC_SENTRY_DSN */
export async function register() {
  if (!SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") Sentry.init(sentryOptions());
}

/** يلتقط أخطاء الصفحات وServer Actions والمسارات */
export const onRequestError = SENTRY_DSN ? Sentry.captureRequestError : undefined;
