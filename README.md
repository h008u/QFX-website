# QFX — منصة وكيل فوركس (IB Platform)

منصة متكاملة لوكيل معرّف (Introducing Broker) تعمل بتكلفة **$0** على الخطط المجانية:

| الجزء | المسار | الاستضافة |
| --- | --- | --- |
| الموقع (Landing, الأسواق، التوصيات، المجتمع، لوحة التحكم) | `apps/web` — Next.js 15 + Tailwind | Vercel (Hobby) |
| بوت تيليجرام + API + المهام الآلية | `apps/bot` — grammY + Hono (Webhooks) | Vercel (Hobby) — مشروع ثانٍ |
| قاعدة البيانات + Auth + Realtime | `supabase/` | Supabase (Free) |
| أنواع ومنطق مشترك | `packages/shared` | — |

```text
[الزوار] → [Vercel: الموقع] ◄──Realtime── [Supabase: DB/Auth]
                │ (لوحة التحكم)                    ▲
                ▼                                   │ service_role
        [Vercel: البوت]      ──────────────────────┘
          ▲            │
 Telegram/TradingView  ▼
   Webhooks     [قناة تيليجرام]
```


## أبرز الميزات
- **الموقع:** صفحة هبوط قابلة للتعديل المباشر، 5 ثيمات، أسواق بشارتات شموع، توصيات وأخبار بتحديث فوري، مدونة، مجتمع وتعليقات، إحالات، سيو وامتثال كامل.
- **لوحة الإدارة:** أدوار (مدير/محرر/مشاهد)، مراجعة ونشر وجدولة، تقويم محتوى، أداء التوصيات، تنبيهات أسعار، بوتات تحليل، ربط MT5، تحقق بخطوتين، إشعارات للجهاز.
- **البوت:** أوامر تيليجرام، Webhooks لـ TradingView و MT5، ودورة مهام آلية (أخبار، مفكرة، تحيات، ملخص أسبوعي).

## التوثيق
| الملف | المحتوى |
|---|---|
| [docs/deployment.md](docs/deployment.md) | النشر على Vercel + Supabase خطوة بخطوة، دورة المهام، TradingView، MT5، تدوير الأسرار |
| [docs/development.md](docs/development.md) | التشغيل محلياً وكل أنواع الاختبارات (وحدات، E2E، RLS) |
| [docs/features.md](docs/features.md) | صفحات الموقع وأوامر البوت ومسارات الـ API |
| [docs/admin.md](docs/admin.md) | صفحات لوحة الإدارة، الإعدادات الإضافية، وقاعدة البيانات |
| [docs/design.md](docs/design.md) | التصميم والثيمات، المحتوى القابل للتعديل، السيو والامتثال والمقالات |

## بداية سريعة
```bash
npm install
cp apps/web/.env.example apps/web/.env.local
npm run dev:web
```
يعمل ببيانات توضيحية بدون أي مفاتيح. الفحوصات: `npm run typecheck && npm run lint && npm test && npm run build`.

> ⚠️ تداول العملات بالهامش عالي المخاطر. المحتوى تعليمي وليس نصيحة استثمارية.
