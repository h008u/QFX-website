import type { BotSettings } from "@qfx/shared";
import { db } from "../supabase";
import { intake } from "./intake";
import { getPrices } from "./prices";

interface AlertRow {
  id: string;
  symbol: string;
  direction: "above" | "below";
  price: number;
  note: string | null;
  repeat: boolean;
  cooldown_min: number;
  last_price: number | null;
  triggered_at: string | null;
  trigger_count: number;
}

const hit = (a: AlertRow, price: number) => (a.direction === "above" ? price >= Number(a.price) : price <= Number(a.price));

/** يحدد هل يُطلق التنبيه: مرة واحدة، أو متكرر بشرط عبور السعر من جديد وانتهاء فترة التهدئة */
export function shouldTrigger(a: AlertRow, price: number, now: Date): boolean {
  if (!hit(a, price)) return false;
  if (!a.triggered_at) return true;
  if (!a.repeat) return false;
  const cooled = now.getTime() - new Date(a.triggered_at).getTime() >= a.cooldown_min * 60_000;
  const crossed = a.last_price === null || !hit(a, Number(a.last_price));
  return cooled && crossed;
}

/** تنبيهات الأسعار: "إذا XAUUSD صعد فوق 2400" — البوت يراقب السعر بنفسه */
export async function runPriceAlerts(s: BotSettings, now = new Date()) {
  const { data, error } = await db().from("price_alerts").select("*").eq("active", true).limit(100);
  if (error) throw error;
  const alerts = (data ?? []) as AlertRow[];
  if (!alerts.length) return { checked: 0, triggered: 0 };
  const prices = await getPrices(alerts.map((a) => a.symbol));
  let triggered = 0;
  for (const a of alerts) {
    const price = prices.get(a.symbol);
    if (price === undefined) continue;
    const fire = shouldTrigger(a, price, now);
    const patch: Record<string, unknown> = { last_price: price, last_checked_at: now.toISOString() };
    if (fire) {
      triggered++;
      patch.triggered_at = now.toISOString();
      patch.trigger_count = a.trigger_count + 1;
      if (!a.repeat) patch.active = false;
      const arrow = a.direction === "above" ? "📈 فوق" : "📉 تحت";
      await intake(
        {
          kind: "price_alert",
          title: `${a.symbol} ${arrow} ${a.price}`,
          body: [`🔔 **تنبيه سعر — ${a.symbol}**`, "", `السعر الآن \`${price}\` (${arrow} ${Number(a.price)})`, a.note ? `\n${a.note}` : ""]
            .filter((l) => l !== "")
            .join("\n"),
          external_id: `price:${a.id}:${a.trigger_count + 1}`,
          score: 60,
          policy: "price_alert",
          skipRules: true,
        },
        s,
        now,
      );
    }
    await db().from("price_alerts").update(patch).eq("id", a.id);
  }
  return { checked: alerts.length, triggered };
}
