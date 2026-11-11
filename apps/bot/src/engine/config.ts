import { mergeSettings, type BotSettings, type Destination } from "@qfx/shared";
import { getEnv } from "../env";
import { db } from "../supabase";

let cache: { at: number; value: BotSettings } | null = null;

/** الإعدادات من جدول settings مدموجة مع الافتراضية (تخزين مؤقت 20 ثانية) */
export async function loadSettings(force = false): Promise<BotSettings> {
  if (!force && cache && Date.now() - cache.at < 20_000) return cache.value;
  const { data, error } = await db().from("settings").select("key, value").not("key", "like", "state.%");
  if (error) throw error;
  const value = mergeSettings(data ?? []);
  cache = { at: Date.now(), value };
  return value;
}

export const invalidateSettings = () => {
  cache = null;
};

/** أماكن النشر؛ إذا لم تُضبط من اللوحة نستخدم TELEGRAM_CHANNEL_ID لكل الأنواع */
export function destinationsOf(s: BotSettings): Destination[] {
  if (s.destinations.length) return s.destinations;
  const ch = getEnv().channelId;
  return ch ? [{ id: "default", chat_id: ch, label: "القناة", kinds: "all", enabled: true }] : [];
}

/** حالة داخلية للبوت (آخر تحية، آخر استطلاع...) محفوظة كـ settings بمفتاح state.* */
export async function getState<T>(name: string, fallback: T): Promise<T> {
  const { data } = await db().from("settings").select("value").eq("key", `state.${name}`).maybeSingle();
  return (data?.value as T) ?? fallback;
}

export async function setState(name: string, value: unknown) {
  const { error } = await db().from("settings").upsert({ key: `state.${name}`, value });
  if (error) throw error;
}
