# التشغيل محلياً والاختبارات

## التشغيل
```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/bot/.env.example apps/bot/.env
npm run dev:web   # http://localhost:3000
npm run dev:bot   # http://localhost:8080
```
بدون مفاتيح Supabase يعمل الموقع ولوحة الإدارة **ببيانات توضيحية** (وضع المعاينة).

## الفحوصات
```bash
npm run typecheck && npm run lint && npm test && npm run build
```

| النوع | المكان | الأمر |
|---|---|---|
| وحدات المنطق المشترك | `packages/shared/src/*.test.ts` | `npm test -w @qfx/shared` |
| البوت (المحرك + طبقة HTTP والمصادقة) | `apps/bot/src/**/*.test.ts` | `npm test -w @qfx/bot` |
| الموقع (وحدات) | `apps/web/tests/*.test.ts` | `npm test -w @qfx/web` |
| الواجهة من البداية للنهاية (Playwright) | `apps/web/e2e/*.spec.ts` | انظر أدناه |
| سياسات RLS على PostgreSQL | `supabase/tests` | انظر أدناه |

### اختبارات الواجهة (E2E)
تعمل على نسخة مبنية من الموقع في الوضع التجريبي (بدون Supabase، لا تكتب بيانات حقيقية): الصفحات العامة، شريط الكوكيز، نموذج الانضمام، الشارت، الثيمات، لوحة الإدارة وبحث `Ctrl+K`، التعديل المباشر، وعرض الجوال.
```bash
npx playwright install chromium        # مرة واحدة
npm run build -w @qfx/web
npm run e2e -w @qfx/web
```
عند الفشل في CI يُرفع تقرير `playwright-report` كملف مرفق بالتشغيل.

### اختبارات RLS
```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres supabase/tests/run.sh
```

### فحص بناء البوت كما على Vercel
```bash
cd apps/bot
mkdir -p .vercel && echo '{"projectId":"local","orgId":"local","settings":{"framework":null}}' > .vercel/project.json
npx vercel build --yes
```
CI يشغّل نفس الفحص في كل دفع.
