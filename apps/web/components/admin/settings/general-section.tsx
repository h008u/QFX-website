"use client";

import { type BotSettings } from "@qfx/shared";
import { ListInput, Section, Switch } from "../ui";
import { Field, inputCls, useSection } from "./common";

const TIMEZONES = ["Asia/Riyadh", "Asia/Baghdad", "Asia/Dubai", "Asia/Kuwait", "Asia/Amman", "Africa/Cairo", "Africa/Casablanca", "Europe/Istanbul", "Europe/London", "UTC"];

export function GeneralSection({ initial, canEdit }: { initial: BotSettings["general"]; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("general", initial);
  return (
    <Section id="general" title="⚙️ عام" description="المنطقة الزمنية لكل المواعيد، والتوقيع الذي ينزل بآخر كل منشور، والإيقاف المؤقت للنشر التلقائي.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="المنطقة الزمنية">
          <select className={inputCls} value={v.timezone} disabled={!canEdit} onChange={(e) => set({ ...v, timezone: e.target.value })}>
            {[...new Set([v.timezone, ...TIMEZONES])].map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <Switch checked={v.paused} disabled={!canEdit} onChange={(paused) => set({ ...v, paused })} label="⏸ إيقاف النشر التلقائي مؤقتاً" description="المحتوى الجديد ينتظر موافقتك بدل النزول مباشرة (مفيد بالعطل)." />
        </div>
        <Field label="التوقيع" hint="مثال: 📈 **QFX** | [قناتنا](https://t.me/qfx) — اتركه فارغاً لإلغائه">
          <input className={inputCls} value={v.signature} disabled={!canEdit} onChange={(e) => set({ ...v, signature: e.target.value })} dir="auto" />
        </Field>
        <Field label="نص التحذير للمنشورات التحليلية">
          <input className={inputCls} value={v.disclaimer} disabled={!canEdit} onChange={(e) => set({ ...v, disclaimer: e.target.value })} />
        </Field>
      </div>
      {bar(canEdit)}
    </Section>
  );
}

export function HolidaysSection({ initial, canEdit }: { initial: BotSettings["holidays"]; canEdit: boolean }) {
  const { value, setValue, bar } = useSection("holidays", initial);
  return (
    <Section id="holidays" title="🏖 عطل الأسواق" description="في العطلة: التحية الصباحية تنبّه، والافتتاح يُستبدل برسالة، والإغلاق والأجندة لا تنزل. الصيغة: MM-DD: الاسم">
      <ListInput
        value={value.map((h) => `${h.date}: ${h.name}`)}
        rows={5}
        placeholder={"12-25: عيد الميلاد\n01-01: رأس السنة"}
        onChange={(lines) =>
          setValue(
            lines
              .map((l) => {
                const m = l.match(/^(\d{2}-\d{2})\s*:?\s*(.*)$/);
                return m ? { date: m[1], name: m[2] || "عطلة" } : null;
              })
              .filter(Boolean) as BotSettings["holidays"],
          )
        }
      />
      {bar(canEdit)}
    </Section>
  );
}

export function TradingViewSection({ initial, webhookUrl, canEdit }: { initial: BotSettings["tradingview"]; webhookUrl: string | null; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("tradingview", initial);
  return (
    <Section id="tradingview" title="🔔 تنبيهات TradingView (Webhook)" description="تحتاج اشتراك TradingView مدفوع. التنبيه يصير توصية تنزل فوراً بكل الأماكن.">
      <Switch checked={v.enabled} disabled={!canEdit} onChange={(enabled) => set({ ...v, enabled })} label="استقبال التنبيهات" />
      <div className="mt-4 space-y-2 text-sm">
        <p className="text-muted-foreground">رابط الـ Webhook (سري — ضعه في خانة Webhook URL في TradingView):</p>
        <code className="num block overflow-x-auto rounded-md border border-border bg-background px-3 py-2 text-xs" dir="ltr">
          {webhookUrl ?? "اضبط BOT_PUBLIC_URL في الموقع لعرض الرابط"}
        </code>
        <p className="text-muted-foreground">خانة Message:</p>
        <code className="num block overflow-x-auto whitespace-pre rounded-md border border-border bg-background px-3 py-2 text-xs" dir="ltr">
          {'{"symbol":"{{ticker}}","direction":"BUY","entry":{{close}},"sl":2340,"tp":2360,"notes":"كسر مقاومة"}'}
        </code>
      </div>
      {bar(canEdit)}
    </Section>
  );
}
