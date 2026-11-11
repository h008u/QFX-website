/** قراءة متغيرات البيئة والتحقق منها عند الإقلاع */

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

const optional = (name: string, fallback = "") => process.env[name]?.trim() || fallback;

export interface Env {
  telegramToken: string;
  webhookSecret: string;
  channelId: string;
  adminIds: Set<number>;
  supabaseUrl: string;
  supabaseServiceKey: string;
  botApiKey: string;
  tradingViewSecret: string;
  publicUrl: string;
  siteUrl: string;
  port: number;
  twelveDataKey: string;
}

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const webhookSecret = required("TELEGRAM_WEBHOOK_SECRET");
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET may only contain A-Z, a-z, 0-9, _ and -");
  }
  cached = {
    telegramToken: required("TELEGRAM_BOT_TOKEN"),
    webhookSecret,
    // مكان النشر الافتراضي إذا لم تُضبط أماكن النشر من اللوحة
    channelId: optional("TELEGRAM_CHANNEL_ID"),
    adminIds: new Set(
      optional("TELEGRAM_ADMIN_IDS")
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    botApiKey: required("BOT_API_KEY"),
    tradingViewSecret: optional("TRADINGVIEW_WEBHOOK_SECRET"),
    publicUrl: optional("PUBLIC_URL").replace(/\/$/, ""),
    siteUrl: optional("SITE_URL").replace(/\/$/, ""),
    port: Number(optional("PORT", "8080")),
    twelveDataKey: optional("TWELVEDATA_API_KEY"),
  };
  return cached;
}
