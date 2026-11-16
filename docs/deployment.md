# النشر خطوة بخطوة (Vercel + Supabase)

المشروع يُنشر كمشروعين منفصلين على **Vercel** من نفس المستودع، مع **Supabase** لقاعدة البيانات:

| مشروع Vercel | Root Directory | ماذا يحتوي |
|---|---|---|
| `qfx-web` | `apps/web` | الموقع ولوحة الإدارة (Next.js — يُكتشف تلقائياً) |
| `qfx-bot` | `apps/bot` | البوت والـ API والمهام (دالة Serverless واحدة — الإعداد في `apps/bot/vercel.json`) |

> الخطة المجانية (Hobby) تكفي. بخلاف الخوادم المجانية التي «تنام»، دوال Vercel تعمل فوراً عند كل طلب، فلا حاجة لطلبات إيقاظ.

## 1. Supabase
- أنشئ مشروعاً، ثم نفّذ ملفات `supabase/migrations/` بالترتيب في SQL Editor (أو `supabase db push`). اختيارياً نفّذ `seed.sql`.
- Authentication → URL Configuration: ضع رابط موقعك في **Site URL**، وأضف `https://<موقعك>/auth/callback` إلى **Redirect URLs**.
- بريد Supabase المدمج محدود بعدد قليل من الرسائل في الساعة؛ للإنتاج اربط SMTP مجاني (مثل Resend أو Brevo) من Authentication → SMTP Settings.
- لجعل حسابك مديراً بعد أول دخول للموقع (مرة واحدة فقط، بعدها تدير الفريق من اللوحة):
  ```sql
  update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
  ```

## 2. تيليجرام
أنشئ بوتاً عبر @BotFather، أنشئ قناة وأضف البوت **مشرفاً** فيها. أرسل `/id` للبوت لمعرفة معرّفك ووضعه في `TELEGRAM_ADMIN_IDS`.

## 3. البوت على Vercel (`apps/bot`)
1. Vercel → Add New → Project → اختر هذا المستودع.
2. **Root Directory = `apps/bot`**، واترك Framework Preset على **Other** (الإعدادات تُقرأ من `apps/bot/vercel.json`: التثبيت من جذر المستودع، البناء بـ `tsup`، وتحويل كل المسارات للدالة `api/index.js`).
3. تأكد أن **Include files outside the root directory** مفعّل (الافتراضي) لأن البوت يستخدم الحزمة المشتركة `packages/shared`.
4. أضف متغيرات `apps/bot/.env.example` (ما عدا `PORT`). ولّد الأسرار بـ `openssl rand -hex 32`:
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ADMIN_IDS`, `TELEGRAM_CHANNEL_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BOT_API_KEY`, `TRADINGVIEW_WEBHOOK_SECRET`, `MT5_SECRET`, `PUBLIC_URL` (رابط مشروع البوت نفسه مثل `https://qfx-bot.vercel.app`), `SITE_URL`, وعند الحاجة `VAPID_*` و `TWELVEDATA_API_KEY`.
5. Deploy، ثم افتح `https://<bot>/health` — يجب أن يرد `{"ok":true}`.
6. سجّل الـ Webhook مرة واحدة من جهازك (مع ضبط نفس المتغيرات في `apps/bot/.env`):
   ```bash
   npm run set-webhook -w @qfx/bot
   ```

**حدود مهمة:**
- مدة الطلب القصوى مضبوطة على 60 ثانية (`maxDuration` في `vercel.json`). إذا كانت دورة المهام تتجاوزها (رموز واستراتيجيات كثيرة) ارفعها حتى 300 (متاحة مع Fluid Compute على الخطة المجانية).
- لا يوجد عمل في الخلفية بعد الرد: كل طلب ينتظر انتهاء عمله، وهذا ما يفعله الكود حالياً.
- البديل لغير Vercel: `apps/bot/Dockerfile` (خادم Node دائم عبر `src/index.ts`) لأي منصة Docker.

## 4. الموقع على Vercel (`apps/web`)
Add New → Project → نفس المستودع → **Root Directory = `apps/web`** (Next.js يُكتشف تلقائياً)، وأضف متغيرات `apps/web/.env.example`.
- `BOT_API_URL` و `BOT_PUBLIC_URL` = رابط مشروع البوت.
- `BOT_API_KEY` و `MT5_SECRET` يجب أن تطابق قيمها في مشروع البوت.

## 5. دورة المهام (كل 5 دقائق)
مهام Vercel المجدولة (Cron) على الخطة المجانية تعمل **مرة واحدة يومياً** فقط، لذلك نستخدم مُشغّلاً خارجياً مجانياً:
- **الأساسي:** [cron-job.org](https://cron-job.org) — مهمة كل 5 دقائق: `POST https://<bot>/api/jobs/tick` مع ترويسة `Authorization: Bearer <BOT_API_KEY>`.
- **احتياطي:** `.github/workflows/bot-tick.yml` يفعل نفس الشيء كل 10 دقائق بعد إضافة أسرار GitHub `BOT_PUBLIC_URL` و `BOT_API_KEY`.

الدورة محمية بقفل في قاعدة البيانات، فلا ضرر من تشغيل المُشغّلين معاً.

## 6. اللوحة
ادخل `/admin` بحسابك المدير، أضف أماكن النشر من «الإعدادات» واضغط «فحص الصلاحيات»، ثم «فحص المصادر».

## 7. الأسعار
- **الموقع:** أسعار حقيقية تلقائياً بدون مفاتيح — Yahoo Finance للعملات والنفط وعقود المعادن، Binance للكريبتو، وgold-api.com للسعر الفوري للذهب والفضة (تُضبط عليه شموع العقود الآجلة). الشموع تُخزَّن 5 دقائق وآخر سعر 30 ثانية على الخادم، والصفحات المفتوحة تتحدث كل 30 ثانية عبر `/api/quotes`، فعدد الطلبات للمصادر ثابت مهما كثر الزوار. `TWELVEDATA_API_KEY` اختياري كمصدر احتياطي.
- **البوت:** تنبيهات الأسعار ونتيجة الاستطلاع وبوتات التحليل ما زالت تحتاج `TWELVEDATA_API_KEY` (مجاني، 800 طلب/يوم).
- المصادر المجانية غير رسمية (Yahoo تحديداً)؛ إن توقفت يوماً يعرض الموقع آخر شموع مخزّنة ثم بيانات توضيحية مع تنبيه، ولا يتعطل.

## 8. TradingView
الرابط: `https://<bot>/webhooks/tradingview`، وضع السر **داخل الرسالة** بدل الرابط حتى لا يظهر في سجلات الطلبات:
```json
{"secret":"<TRADINGVIEW_WEBHOOK_SECRET>","symbol":"{{ticker}}","direction":"BUY","entry":{{close}},"sl":2340,"tp":2360}
```
(الصيغة القديمة `?secret=...` في الرابط ما زالت مدعومة.)

## 9. MT5
من صفحة «ربط MT5» في اللوحة انسخ **PanelUrl** (`https://<bot>/mt5`) و **PanelSecret** إلى إعدادات إضافة `QFXBridge.mq5`. السر يُرسل في ترويسة `X-QFX-Secret` ولا يظهر في الرابط. الإعداد القديم (`/mt5/<السر>` في PanelUrl) ما زال يعمل.

## تدوير الأسرار
غيّر السر في متغيرات Vercel (ثم Redeploy) وفي مكان استخدامه:
| السر | أين يُستخدم أيضاً |
|---|---|
| `BOT_API_KEY` | مشروع الموقع + cron-job.org + أسرار GitHub |
| `TELEGRAM_WEBHOOK_SECRET` | أعد تشغيل `npm run set-webhook -w @qfx/bot` |
| `TRADINGVIEW_WEBHOOK_SECRET` | رسائل تنبيهات TradingView |
| `MT5_SECRET` | مشروع الموقع + خانة PanelSecret في MT5 |

## ملاحظات
- ترجمة المفكرة تعتمد على قاموس مصطلحات مجاني (مع إبقاء العنوان الإنجليزي عند عدم التطابق). الترجمة بالذكاء الاصطناعي ممكنة لاحقاً لكنها مدفوعة، لذلك لم تُفعَّل للحفاظ على تكلفة $0.
