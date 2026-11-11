import { Bot } from "grammy";
import { getEnv } from "./env";

let bot: Bot | undefined;

export function getBot(): Bot {
  // TELEGRAM_API_ROOT للاختبارات فقط (خادم تيليجرام وهمي)
  if (!bot) {
    const apiRoot = process.env.TELEGRAM_API_ROOT;
    bot = new Bot(getEnv().telegramToken, apiRoot ? { client: { apiRoot } } : undefined);
  }
  return bot;
}
