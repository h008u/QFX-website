import "server-only";
import { DEFAULT_SETTINGS, fingerprint } from "@qfx/shared";
import { FakeDb } from "@qfx/shared/fake-db";

/** بيانات وضع المعاينة: تُبنى مرة واحدة لكل عملية خادم، والتعديلات تبقى بالذاكرة فقط */
const g = globalThis as unknown as { __qfxDemoDb?: FakeDb };

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const ahead = (min: number) => new Date(Date.now() + min * 60_000).toISOString();

function seed(db: FakeDb) {
  const res = (ok: boolean, err?: string) => [
    { dest: "ch", chat_id: "@qfx_signals", ok: true, message_id: 1200, at: ago(5) },
    ...(ok ? [{ dest: "grp", chat_id: "-1001234567890", ok: true, message_id: 88, at: ago(5) }] : [{ dest: "grp", chat_id: "-1001234567890", ok: false, error: err, at: ago(5) }]),
  ];
  const posts = [
    { kind: "news", status: "published", title: "الذهب يرتفع لأعلى مستوى في أسبوعين مع تراجع الدولار", body: "📰 **الذهب يرتفع لأعلى مستوى في أسبوعين مع تراجع الدولار**\n\nارتفعت أسعار الذهب مع تراجع عوائد السندات الأمريكية قبيل بيانات التضخم.\n\n#الذهب #العملات\nالمصدر: [Investing عربي — العملات](https://sa.investing.com)", source: "Investing عربي — العملات", score: 88, categories: ["gold", "forex"], results: res(true), created_at: ago(12), published_at: ago(12) },
    { kind: "news", status: "pending", title: "Oil steadies as traders weigh OPEC+ output plans", body: "📰 **النفط يستقر بينما يدرس المتداولون خطط إنتاج أوبك+**\n\nاستقرت أسعار النفط مع ترقب قرار أوبك+ بشأن مستويات الإنتاج للربع القادم.\n\n#النفط\nالمصدر: TradingView News", source: "TradingView News", score: 58, reason: "تقييم متوسط (58)", categories: ["oil"], created_at: ago(18) },
    { kind: "news", status: "pending", title: "Fed's Waller says more cuts possible if inflation cools", body: "📰 **والر من الفيدرالي: مزيد من الخفض ممكن إذا تباطأ التضخم**\n\n#البنوك_المركزية", source: "TradingView News", score: 64, reason: "تقييم متوسط (64)", categories: ["central"], created_at: ago(25) },
    { kind: "news", status: "duplicate", title: "Gold climbs to two-week high as dollar slips", body: "📰 Gold climbs to two-week high as dollar slips", source: "TradingView News", score: 86, reason: "مكرر من Investing عربي — العملات: الذهب يرتفع لأعلى مستوى في أسبوعين مع تراجع الدولار", categories: ["gold"], created_at: ago(11) },
    { kind: "news", status: "filtered", title: "Sponsored: Join our free trading webinar", body: "📰 Sponsored webinar", source: "ForexLive", score: 5, reason: "كلمة ممنوعة: sponsored", created_at: ago(40) },
    { kind: "news", status: "filtered", title: "Tech earnings beat expectations", body: "📰 أرباح شركات التكنولوجيا", source: "CNBC — الاقتصاد", score: 30, reason: "النوع مطفي", categories: ["stocks"], created_at: ago(55) },
    { kind: "event_alert", status: "published", title: "مؤشر أسعار المستهلك (شهري)", body: "⚠️ <b>بعد 15 دقيقة: مؤشر أسعار المستهلك (شهري)</b>\n🇺🇸 الدولار الأمريكي • 🔴 تأثير مرتفع", format: "html", score: 85, results: res(true), created_at: ago(90), published_at: ago(90) },
    { kind: "agenda", status: "published", title: "أجندة اليوم", body: "🗓 <b>أهم أخبار المفكرة الاقتصادية</b>", format: "html", score: 85, results: res(false, "Forbidden: bot is not a member of the supergroup chat"), created_at: ago(300), published_at: ago(300) },
    { kind: "greeting", status: "published", title: "التحية الصباحية", body: "☀️ صباح الخير متداولينا الأعزاء\nنتمنى لكم يوماً موفقاً وصفقات رابحة 📈", results: res(true), created_at: ago(360), published_at: ago(360) },
    { kind: "signal", status: "published", title: "BUY XAUUSD", body: "🟢 <b>توصية جديدة — شراء XAUUSD</b>", format: "html", source: "التوصيات", results: res(true), created_at: ago(60), published_at: ago(60) },
    { kind: "manual", status: "scheduled", title: null, body: "📊 **تحليل EURUSD — H4**\n\nالسعر يختبر دعم 1.0820، والإغلاق تحته يفتح المجال نحو 1.0780.", disclaimer: true, scheduled_at: ahead(150), created_at: ago(30) },
    { kind: "manual", status: "scheduled", title: null, body: "🎓 **درس الأسبوع:** كيف تحدد حجم العقد المناسب لرأس مالك؟", scheduled_at: ahead(60 * 26), created_at: ago(30) },
    { kind: "tradingview", status: "failed", title: "XAUUSD كسر مقاومة", body: "🔔 **تنبيه TradingView — XAUUSD**\nكسر مقاومة 2660", score: 70, reason: "لا يوجد مكان نشر يقبل هذا النوع", created_at: ago(200) },
    { kind: "price_alert", status: "published", title: "XAUUSD 📈 فوق 2650", body: "🔔 **تنبيه سعر — XAUUSD**\n\nالسعر الآن `2651.2` (📈 فوق 2650)", score: 60, results: res(true), created_at: ago(70), published_at: ago(70) },
  ];
  for (let d = 1; d < 7; d++) {
    for (let i = 0; i < 4 + ((d * 3) % 5); i++) {
      posts.push({ kind: i % 3 ? "news" : "greeting", status: "published", title: `منشور سابق ${d}-${i}`, body: "…", results: res(true), created_at: ago(d * 1440 + i * 30), published_at: ago(d * 1440 + i * 30) } as never);
    }
  }
  for (const p of posts) db.t("posts").push({ id: crypto.randomUUID(), format: "markup", results: [], categories: [], disclaimer: false, reply_to: null, photo_url: null, source: null, source_url: null, external_id: null, score: null, reason: null, scheduled_at: null, published_at: null, updated_at: p.created_at, fingerprint: p.title ? fingerprint(p.title) : null, ...p });

  db.t("settings").push(
    { key: "general", value: { ...DEFAULT_SETTINGS.general, signature: "📈 **QFX** | [قناتنا](https://t.me/qfx_signals)" } },
    { key: "destinations", value: [
      { id: "ch", chat_id: "@qfx_signals", label: "القناة العامة", kinds: "all", enabled: true },
      { id: "grp", chat_id: "-1001234567890", thread_id: 12, label: "مجموعة العملاء — موضوع التحليلات", kinds: ["news", "signal", "agenda", "event_alert"], enabled: true },
    ] },
    { key: "rules", value: { ...DEFAULT_SETTINGS.rules, watch: ["powell", "باول", "nfp"] } },
  );

  const signals = [
    ["XAUUSD", "gold", "BUY", 2650, 2632, 2680, "open", null, 60],
    ["GBPUSD", "forex", "BUY", 1.264, 1.261, 1.269, "tp_hit", 50, 1500],
    ["EURUSD", "forex", "SELL", 1.085, 1.088, 1.081, "sl_hit", -30, 3000],
    ["XAUUSD", "gold", "BUY", 2610, 2595, 2640, "tp_hit", 300, 5800],
    ["USDJPY", "forex", "SELL", 152.4, 153.0, 151.2, "tp_hit", 120, 9000],
    ["USOIL", "oil", "SELL", 78.4, 79.2, 77.0, "closed", 45, 14000],
    ["EURUSD", "forex", "BUY", 1.079, 1.076, 1.085, "sl_hit", -30, 20000],
    ["XAUUSD", "gold", "SELL", 2700, 2715, 2670, "tp_hit", 300, 30000],
    ["GBPUSD", "forex", "SELL", 1.28, 1.284, 1.272, "tp_hit", 80, 40000],
    ["AUDUSD", "forex", "BUY", 0.655, 0.652, 0.661, "sl_hit", -30, 50000],
  ] as const;
  for (const [symbol, asset_class, direction, entry_price, stop_loss, take_profit_1, status, result_pips, minAgo] of signals) {
    db.t("signals").push({ id: crypto.randomUUID(), symbol, asset_class, direction, entry_price, stop_loss, take_profit_1, take_profit_2: null, take_profit_3: null, status, result_pips, notes: null, source: "admin", telegram_message_id: null, created_at: ago(minAgo), opened_at: ago(minAgo), closed_at: status === "open" ? null : ago(minAgo - 300), updated_at: ago(minAgo) });
  }

  const ev = (title: string, en: string, cur: string, impact: string, min: number, f?: string, p?: string) => ({ id: crypto.randomUUID(), kind: "calendar", title, body: null, impact, currency: cur, event_time: ahead(min), source: "ForexFactory", external_id: `ff:${cur}:${en}:${min}`, meta: { title_en: en, forecast: f ?? null, previous: p ?? null }, created_at: ago(100), asset_class: null, published_to_telegram: false });
  db.t("news").push(
    ev("مؤشر أسعار المستهلك (شهري)", "CPI m/m", "USD", "high", 95, "0.3%", "0.2%"),
    ev("طلبات إعانة البطالة", "Unemployment Claims", "USD", "high", 95, "221K", "217K"),
    ev("مبيعات التجزئة (شهري)", "Retail Sales m/m", "GBP", "medium", 60 * 20, "0.4%", "-0.3%"),
    ev("قرار الفائدة الأوروبية", "Main Refinancing Rate", "EUR", "high", 60 * 44, "3.15%", "3.40%"),
    ev("خطاب رئيس الفيدرالي", "Fed Chair Powell Speaks", "USD", "high", 60 * 50),
    ev("التغير في الوظائف غير الزراعية (NFP)", "Non-Farm Employment Change", "USD", "high", 60 * 70, "180K", "254K"),
    ev("معدل البطالة", "Unemployment Rate", "USD", "high", 60 * 70, "4.1%", "4.1%"),
  );

  db.t("price_alerts").push(
    { id: crypto.randomUUID(), symbol: "XAUUSD", direction: "above", price: 2680, note: "اختراق قمة الأسبوع", repeat: false, cooldown_min: 60, active: true, last_price: 2651.2, last_checked_at: ago(3), triggered_at: null, trigger_count: 0, created_at: ago(500) },
    { id: crypto.randomUUID(), symbol: "EURUSD", direction: "below", price: 1.08, note: null, repeat: true, cooldown_min: 120, active: true, last_price: 1.0842, last_checked_at: ago(3), triggered_at: ago(2000), trigger_count: 2, created_at: ago(9000) },
    { id: crypto.randomUUID(), symbol: "XAUUSD", direction: "above", price: 2650, note: null, repeat: false, cooldown_min: 60, active: false, last_price: 2651.2, last_checked_at: ago(70), triggered_at: ago(70), trigger_count: 1, created_at: ago(3000) },
  );

  const staff = [
    { id: "demo-admin", full_name: "مدير المعاينة", role: "admin", telegram_username: "qfx_owner" },
    { id: crypto.randomUUID(), full_name: "سارة — محررة", role: "editor", telegram_username: "sara_fx" },
    { id: crypto.randomUUID(), full_name: "علي — مشاهد", role: "viewer", telegram_username: null },
  ];
  const members = [["أحمد", "abc123", null], ["محمد", "def456", "abc123"], ["خالد", "ghi789", "abc123"], ["ليلى", "jkl012", "def456"]];
  for (const s of staff) db.t("profiles").push({ ...s, referral_code: s.id.slice(0, 8), referred_by: null, created_at: ago(90000) });
  members.forEach(([n, code, by], i) => db.t("profiles").push({ id: crypto.randomUUID(), full_name: n, role: "member", telegram_username: null, referral_code: code, referred_by: by, created_at: ago(1000 * (i + 1)) }));

  db.t("leads").push(
    { id: crypto.randomUUID(), full_name: "يوسف عبدالله", email: null, phone: "+9647701234567", telegram_username: "yousef_fx", broker_account_id: "5012345", status: "new", referral_source: "abc123", created_at: ago(45) },
    { id: crypto.randomUUID(), full_name: "مريم", email: "maryam@example.com", phone: null, telegram_username: null, broker_account_id: null, status: "contacted", referral_source: "website", created_at: ago(2000) },
    { id: crypto.randomUUID(), full_name: "حسن", email: null, phone: null, telegram_username: "hassan_trader", broker_account_id: "5019876", status: "funded", referral_source: "website", created_at: ago(9000) },
  );

  const t = (task: string, min: number, ok: boolean, error?: string, result?: unknown) => ({ task, last_run_at: ago(min), ok, error: error ?? null, result: result ?? null, runs: 288, failures: ok ? 0 : 3 });
  db.t("task_runs").push(
    t("publish_due", 2, true, undefined, { due: 0, published: 0 }),
    t("news", 4, true, undefined, { processed: 3, sources: { inv_fx: { ok: true, count: 20 }, inv_eco: { ok: true, count: 20 }, tv_news: { ok: true, count: 40 } } }),
    t("calendar_sync", 30, true, undefined, { stored: 24 }),
    t("event_alerts", 2, true),
    t("price_alerts", 3, false, "أضف TWELVEDATA_API_KEY لتفعيل الأسعار"),
    t("greetings", 2, true),
    t("agenda", 2, true),
    t("weekly", 2, true),
  );

  const a = (action: string, target: string, min: number, who = "مدير المعاينة") => ({ id: Math.floor(Math.random() * 1e9), actor_id: "demo-admin", actor_email: who, action, target, details: null, ip: "127.0.0.1", created_at: ago(min) });
  db.t("audit_log").push(a("post.publish", "منشور يدوي", 30), a("settings.save", "rules", 120, "سارة — محررة"), a("signal.create", "XAUUSD", 60), a("post.reject", "خبر مكرر", 200, "سارة — محررة"), a("login", "—", 400));
}

export function demoDb(): FakeDb {
  if (!g.__qfxDemoDb) {
    g.__qfxDemoDb = new FakeDb();
    seed(g.__qfxDemoDb);
  }
  return g.__qfxDemoDb;
}
