import type { NewsItem, Signal } from "@qfx/shared";

/** بيانات توضيحية تظهر فقط عندما لا تكون Supabase مضبوطة (أثناء التطوير) */
const h = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600_000).toISOString();

const base = {
  take_profit_2: null,
  take_profit_3: null,
  notes: null,
  source: "admin" as const,
  telegram_message_id: null,
};

export const demoSignals: Signal[] = [
  { ...base, id: "d0000000-0000-4000-8000-000000000001", symbol: "USOIL", asset_class: "oil", direction: "SELL", entry_price: 78.4, stop_loss: 79.2, take_profit_1: 77, status: "open", result_pips: null, notes: "رفض عند مقاومة 78.5", opened_at: h(3), closed_at: null, created_at: h(3), updated_at: h(3) },
  { ...base, id: "d0000000-0000-4000-8000-000000000002", symbol: "GBPUSD", asset_class: "forex", direction: "BUY", entry_price: 1.264, stop_loss: 1.261, take_profit_1: 1.269, take_profit_2: 1.272, status: "tp_hit", result_pips: 50, opened_at: h(26), closed_at: h(20), created_at: h(26), updated_at: h(20) },
  { ...base, id: "d0000000-0000-4000-8000-000000000003", symbol: "EURUSD", asset_class: "forex", direction: "SELL", entry_price: 1.085, stop_loss: 1.088, take_profit_1: 1.081, status: "sl_hit", result_pips: -30, opened_at: h(30), closed_at: h(24), created_at: h(30), updated_at: h(24) },
  { ...base, id: "d0000000-0000-4000-8000-000000000004", symbol: "XAUUSD", asset_class: "gold", direction: "BUY", entry_price: 2350.5, stop_loss: 2340, take_profit_1: 2365, take_profit_2: 2380, status: "tp_hit", result_pips: 145, notes: "ارتداد من منطقة طلب قوية", opened_at: h(55), closed_at: h(48), created_at: h(55), updated_at: h(48) },
];

const nb = { body: null, impact: null, currency: null, source: "QFX", source_url: null, external_id: null, event_time: null, published_to_telegram: true, telegram_message_id: null };

export const demoNews: NewsItem[] = [
  { ...nb, id: "n1", kind: "calendar", asset_class: null, title: "مؤشر أسعار المستهلك (شهري)", body: "CPI m/m | المتوقع: 0.3% | السابق: 0.2%", impact: "high", currency: "USD", event_time: h(-5), created_at: h(1) },
  { ...nb, id: "n2", kind: "analysis", asset_class: "gold", title: "الذهب يختبر مقاومة 2380", body: "يتداول الذهب قرب مستوى مقاومة مهم، والإغلاق اليومي فوقه يفتح الطريق نحو 2400. الدعم الأقرب عند 2350.", created_at: h(2) },
  { ...nb, id: "n3", kind: "news", asset_class: "forex", title: "ترقب بيانات التضخم الأمريكية", body: "تترقب الأسواق صدور مؤشر أسعار المستهلك وسط توقعات بتباطؤ طفيف، ما قد يدعم رهانات خفض الفائدة.", impact: "high", currency: "USD", created_at: h(5) },
  { ...nb, id: "n4", kind: "analysis", asset_class: "oil", title: "النفط تحت ضغط عند 78.5", body: "فشل الخام في اختراق المقاومة للمرة الثالثة، مع تكوّن نموذج قمة مزدوجة على إطار الأربع ساعات.", created_at: h(8) },
];
