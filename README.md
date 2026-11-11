# QFX — منصة وكيل فوركس (IB Platform)

منصة متكاملة لوكيل معرّف (Introducing Broker) تعمل بتكلفة **$0** على الخطط المجانية:

| الجزء | المسار | الاستضافة |
| --- | --- | --- |
| الموقع (Landing, الأسواق، التوصيات، المجتمع، لوحة التحكم) | `apps/web` — Next.js 15 + Tailwind | Vercel (Hobby) |
| بوت تيليجرام + API + المهام الآلية | `apps/bot` — grammY + Hono (Webhooks) | Render أو Koyeb (Free) |
| قاعدة البيانات + Auth + Realtime | `supabase/` | Supabase (Free) |
| أنواع ومنطق مشترك | `packages/shared` | — |

```text
[الزوار] → [Vercel: الموقع] ◄──Realtime── [Supabase: DB/Auth]
                │ (لوحة التحكم)                    ▲
                ▼                                   │ service_role
        [Render/Koyeb: البوت] ──────────────────────┘
          ▲            │
 Telegram/TradingView  ▼
   Webhooks     [قناة تيليجرام]
```

## التصميم

واجهة داكنة بأسلوب تطبيقات التداول الاحترافية:
- خلفية `#0A0A0A` وبطاقات `#121212` وحدود رفيعة `#27272A`.
- أخضر `#10B981` للصعود/الربح وأحمر `#FF3B30` للهبوط/الخسارة فقط.
- شريط تنقل سفلي زجاجي (Glassmorphism) على الجوال.
- خط أحادي المسافة (JetBrains Mono) لكل الأسعار والأرقام حتى لا تهتز عند التحديث.
- شارتات شموع بمكتبة **TradingView Lightweight Charts** المجانية (Apache-2.0) مع رسم مستويات التوصيات المفتوحة (الدخول / SL / TP) على الشارت.

## الميزات

**الموقع**
- `/` صفحة هبوط: شارت حي، شريط أسعار، إحصائيات الأداء، مميزات الوكالة، خطوات الانضمام، نموذج طلب انضمام.
- `/markets` قائمة مراقبة + شارت شموع (إطار الساعة) + خطوط التوصيات.
- `/signals` التوصيات الحية والسجل التاريخي، نسبة النجاح ومجموع النقاط — تحديث فوري عبر Realtime.
- `/feed` مغذى أخبار وتحليلات بأسلوب قنوات تيليجرام مع فلترة حسب الأصل (عملات، ذهب، نفط، مؤشرات، المفكرة).
- `/how-it-works` شرح الخطوات والأسئلة الشائعة.
- `/admin` (محمية بـ Basic Auth): نشر توصية، تحديث/إغلاق توصية، نشر خبر/تحليل، وإدارة العملاء المحتملين (CRM مصغّر).
- بدون مفاتيح Supabase يعمل الموقع **ببيانات توضيحية** مع تنبيه واضح.

**البوت** (`apps/bot`)
- `POST /telegram/webhook` — أوامر المدير في تيليجرام:
  - `/signal BUY XAUUSD 2350 SL 2340 TP 2360 TP2 2370 ملاحظة` (يقبل `شراء/بيع` والأرقام العربية)
  - `/close <id> tp|sl|close|cancel [سعر الخروج]` — يرد على رسالة التوصية الأصلية ويحسب النقاط
  - `/news` و `/analysis` (السطر الأول عنوان)، `/id`، `/start`
- `POST /api/signals`، `PATCH /api/signals/:id`، `POST /api/news` — تستخدمها لوحة التحكم (`Authorization: Bearer BOT_API_KEY`).
- `POST /webhooks/tradingview?secret=...` — تنبيهات TradingView (JSON أو نص بصيغة `/signal`).
- `POST /api/jobs/calendar` — يسحب مفكرة الأسبوع (ForexFactory JSON)، يفلتر الأخبار عالية التأثير، يترجمها للعربية بقاموس مصطلحات مجاني، يحفظها في `news` وينشر ملخص اليوم في القناة مرة واحدة.

**قاعدة البيانات** (`supabase/migrations`)
- الجداول: `profiles` (المستخدمون، مرتبطة بـ `auth.users`)، `signals`، `news`، `comments`، `leads`، وعرض `signal_stats`.
- RLS مفعّل: قراءة عامة للتوصيات والأخبار، الكتابة للمدير فقط، الزوار يستطيعون إرسال طلب انضمام فقط.
- Realtime مفعّل على `signals` و `news` و `comments`.

## التشغيل محلياً

```bash
npm install
```

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/bot/.env.example apps/bot/.env
```

```bash
npm run dev:web
```

```bash
npm run dev:bot
```

الفحوصات:

```bash
npm run typecheck && npm test && npm run build
```

## النشر خطوة بخطوة

1. **Supabase**: أنشئ مشروعاً، ثم نفّذ `supabase/migrations/20261111000000_init.sql` في SQL Editor (أو `supabase db push`). اختيارياً نفّذ `seed.sql`.
2. **تيليجرام**: أنشئ بوتاً عبر @BotFather، أنشئ قناة وأضف البوت **مشرفاً** فيها. أرسل `/id` للبوت لمعرفة معرّفك ووضعه في `TELEGRAM_ADMIN_IDS`.
3. **البوت على Render**: New → Blueprint → هذا المستودع (يقرأ `render.yaml`)، واملأ المتغيرات. على Koyeb استخدم `apps/bot/Dockerfile` (البناء من جذر المستودع).
   ثم سجّل الـ Webhook مرة واحدة (مع ضبط المتغيرات محلياً):
   ```bash
   npm run set-webhook -w @qfx/bot
   ```
4. **الموقع على Vercel**: Import → Root Directory = `apps/web`، وأضف متغيرات `apps/web/.env.example`. `BOT_API_KEY` يجب أن يطابق قيمته في خدمة البوت.
5. **المفكرة الاقتصادية**: أضف أسرار GitHub `BOT_PUBLIC_URL` و `BOT_API_KEY`؛ الـ workflow في `.github/workflows/economic-calendar.yml` يوقظ الخدمة كل ساعة ويشغّل المهمة (بديل: cron-job.org).
6. **أسعار حقيقية للشارت** (اختياري): مفتاح مجاني من twelvedata.com في `TWELVEDATA_API_KEY` (800 طلب/يوم، والموقع يخزّن النتائج 15 دقيقة).
7. **TradingView**: في التنبيه ضع الرابط `https://<bot>/webhooks/tradingview?secret=<TRADINGVIEW_WEBHOOK_SECRET>` ورسالة مثل:
   ```json
   {"symbol":"{{ticker}}","direction":"BUY","entry":{{close}},"sl":2340,"tp":2360}
   ```

## ملاحظات

- خدمة Render المجانية تنام بعد 15 دقيقة؛ أول طلب Webhook يوقظها (قد يتأخر ~30-50 ثانية). تيليجرام يعيد المحاولة تلقائياً.
- تعديل دور المستخدم إلى `admin` يتم من SQL: `update profiles set role = 'admin' where id = '...';`
- الخطوات القادمة المقترحة: تسجيل دخول الأعضاء (Supabase Auth) وتفعيل التعليقات في الواجهة، وترجمة الأخبار بالذكاء الاصطناعي.

> ⚠️ تداول العملات بالهامش عالي المخاطر. المحتوى تعليمي وليس نصيحة استثمارية.
