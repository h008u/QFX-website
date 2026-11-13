/**
 * إعدادات Sentry المشتركة. المراقبة تعمل فقط إذا ضُبط NEXT_PUBLIC_SENTRY_DSN.
 * الخصوصية: لا بيانات شخصية (sendDefaultPii=false)، لا تسجيل جلسات، ونحذف الكوكيز وعناوين IP قبل الإرسال.
 */
import type { ErrorEvent } from "@sentry/nextjs";

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function sentryOptions() {
  return {
    dsn: SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES ?? 0.05),
    sendDefaultPii: false,
    beforeSend(event: ErrorEvent) {
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.Cookie;
          delete event.request.headers.authorization;
        }
      }
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
  };
}
