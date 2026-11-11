/**
 * يسجّل رابط الـ Webhook لدى تيليجرام. شغّله مرة واحدة بعد النشر:
 *   npm run set-webhook -w @qfx/bot
 */
import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, "");
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token || !publicUrl || !secret) {
  console.error("Set TELEGRAM_BOT_TOKEN, PUBLIC_URL and TELEGRAM_WEBHOOK_SECRET first.");
  process.exit(1);
}

const bot = new Bot(token);
const url = `${publicUrl}/telegram/webhook`;

await bot.api.setWebhook(url, {
  secret_token: secret,
  allowed_updates: ["message"],
  drop_pending_updates: true,
});
await bot.api.setMyCommands([
  { command: "start", description: "بدء الاستخدام" },
  { command: "help", description: "أوامر المدير" },
  { command: "signal", description: "نشر توصية جديدة" },
  { command: "close", description: "تحديث/إغلاق توصية" },
  { command: "news", description: "نشر خبر" },
  { command: "analysis", description: "نشر تحليل" },
  { command: "id", description: "عرض المعرّف" },
]);

const info = await bot.api.getWebhookInfo();
console.log("Webhook set:", info.url, "| pending:", info.pending_update_count);
