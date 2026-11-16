// معالج Vercel: كل المسارات تصل لدالة Serverless واحدة (api/index.js) عبر rewrites في vercel.json.
// التشغيل المحلي أو على Docker يبقى عبر src/index.ts (خادم Node دائم).
import { createApp } from "./server";

let app: ReturnType<typeof createApp> | undefined;

/** يُنشأ التطبيق عند أول طلب (لا عند تحميل الملف) حتى تظهر أخطاء المتغيرات الناقصة كرد 500 واضح في السجل */
export function handler(req: Request): Response | Promise<Response> {
  app ??= createApp();
  return app.fetch(req);
}
