import { Bot } from "grammy";
import { getEnv } from "./env";

let bot: Bot | undefined;

export function getBot(): Bot {
  if (!bot) bot = new Bot(getEnv().telegramToken);
  return bot;
}

/** ينشر رسالة HTML في القناة ويعيد معرّف الرسالة */
export async function postToChannel(html: string, replyTo?: number | null): Promise<number> {
  const env = getEnv();
  const msg = await getBot().api.sendMessage(env.channelId, html, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(replyTo ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } } : {}),
  });
  return msg.message_id;
}
