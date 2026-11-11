import { parseSignalCommand, type NewsKind, type SignalUpdateInput } from "@qfx/shared";
import type { Bot, Context } from "grammy";
import { getEnv } from "./env";
import { invalidateSettings, loadSettings } from "./engine/config";
import { publishPost } from "./engine/publish";
import { runTick } from "./engine/tick";
import { db } from "./supabase";
import { createNews } from "./services/news";
import { ValidationError, createSignal, updateSignal } from "./services/signals";

const HELP = [
  "🤖 <b>أوامر المدير</b>",
  "",
  "<b>توصية جديدة:</b>",
  "<code>/signal BUY XAUUSD 2350 SL 2340 TP 2360 TP2 2370 ملاحظة</code>",
  "",
  "<b>تحديث توصية</b> (المعرّف يظهر أسفل رسالة التوصية):",
  "<code>/close 1a2b3c4d tp</code> — تحقق الهدف",
  "<code>/close 1a2b3c4d sl</code> — ضرب الوقف",
  "<code>/close 1a2b3c4d close 2365.5</code> — إغلاق يدوي عند سعر",
  "<code>/close 1a2b3c4d cancel</code> — إلغاء",
  "",
  "<b>خبر أو تحليل</b> (السطر الأول عنوان والباقي نص):",
  "<code>/news عنوان الخبر",
  "نص الخبر...</code>",
  "<code>/analysis عنوان التحليل",
  "نص التحليل...</code>",
  "",
  "<code>/pause</code> و <code>/resume</code> — إيقاف/استئناف النشر التلقائي",
  "<code>/status</code> — حالة المهام الآلية",
  "<code>/id</code> — يعرض معرّف حسابك والمحادثة (داخل موضوع مجموعة يعطيك id:topic)",
].join("\n");

const CLOSE_ACTIONS: Record<string, SignalUpdateInput["status"]> = {
  tp: "tp_hit",
  sl: "sl_hit",
  close: "closed",
  closed: "closed",
  cancel: "cancelled",
};

function isAdmin(ctx: Context): boolean {
  return !!ctx.from && getEnv().adminIds.has(ctx.from.id);
}

function errorText(err: unknown): string {
  if (err instanceof ValidationError) return `⚠️ ${err.errors.join("\n⚠️ ")}`;
  console.error("[bot] command failed", err);
  return "❌ حدث خطأ غير متوقع، راجع سجلات الخدمة.";
}

export function registerCommands(bot: Bot) {
  const { siteUrl } = getEnv();

  bot.command("start", (ctx) =>
    ctx.reply(
      [
        "👋 أهلاً بك في <b>QFX</b>",
        "نقدّم توصيات وتحليلات يومية وأهم أخبار المفكرة الاقتصادية باللغة العربية.",
        siteUrl ? `\n🌐 الموقع: ${siteUrl}` : "",
        siteUrl ? `📊 سجل التوصيات: ${siteUrl}/signals` : "",
        siteUrl ? `📝 طريقة الانضمام: ${siteUrl}/how-it-works` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
    ),
  );

  bot.command("id", (ctx) => {
    const thread = ctx.msg.message_thread_id;
    return ctx.reply(
      `user id: ${ctx.from?.id ?? "-"}\nchat id: ${ctx.chat.id}${thread ? `\nلموضوع المجموعة استخدم: ${ctx.chat.id}:${thread}` : ""}`,
    );
  });

  // كل ما يلي للمدراء فقط
  const admin = bot.filter(isAdmin);

  admin.command("help", (ctx) => ctx.reply(HELP, { parse_mode: "HTML" }));

  admin.command("signal", async (ctx) => {
    const parsed = parseSignalCommand(ctx.match);
    if (!parsed.ok) return ctx.reply(`⚠️ ${parsed.error}`);
    try {
      const signal = await createSignal({ ...parsed.value, source: "telegram" });
      await ctx.reply(
        `✅ تم نشر التوصية ${signal.symbol}\nالمعرّف: <code>${signal.id.slice(0, 8)}</code>` +
          (signal.telegram_message_id ? "" : "\n⚠️ تعذّر النشر في القناة — تأكد أن البوت مشرف فيها."),
        { parse_mode: "HTML" },
      );
    } catch (err) {
      await ctx.reply(errorText(err));
    }
  });

  admin.command("close", async (ctx) => {
    const [id, action, value] = ctx.match.trim().split(/\s+/);
    const status = CLOSE_ACTIONS[action?.toLowerCase() ?? ""];
    if (!id || !status) return ctx.reply("الصيغة: /close <المعرّف> tp|sl|close|cancel [سعر الخروج]");
    const exit = value ? Number(value) : undefined;
    try {
      const s = await updateSignal(id, { status, exit_price: Number.isFinite(exit) ? exit : undefined });
      await ctx.reply(`✅ تم تحديث ${s.symbol}: ${s.status}${s.result_pips !== null ? ` (${s.result_pips} نقطة)` : ""}`);
    } catch (err) {
      await ctx.reply(errorText(err));
    }
  });

  const newsHandler = (kind: NewsKind) => async (ctx: Context & { match: string }) => {
    const [title, ...rest] = ctx.match.trim().split("\n");
    if (!title?.trim()) return ctx.reply("اكتب العنوان في السطر الأول بعد الأمر، ثم نص الخبر في الأسطر التالية.");
    try {
      await createNews({ kind, title: title.trim(), body: rest.join("\n").trim() || null, source: "QFX" });
      await ctx.reply("✅ تم النشر في القناة والموقع");
    } catch (err) {
      await ctx.reply(errorText(err));
    }
  };
  admin.command("news", newsHandler("news"));
  admin.command("analysis", newsHandler("analysis"));

  // إيقاف/استئناف النشر التلقائي (مثل /pause في Spir)
  const setPaused = (paused: boolean) => async (ctx: Context) => {
    const s = await loadSettings(true);
    await db().from("settings").upsert({ key: "general", value: { ...s.general, paused } });
    invalidateSettings();
    await ctx.reply(paused ? "⏸ تم إيقاف النشر التلقائي. المحتوى الجديد ينتظر موافقتك." : "▶️ تم استئناف النشر التلقائي.");
  };
  admin.command("pause", setPaused(true));
  admin.command("resume", setPaused(false));

  admin.command("status", async (ctx) => {
    const { data } = await db().from("task_runs").select("task, last_run_at, ok, error").neq("task", "_tick_lock").order("task");
    const s = await loadSettings();
    const lines = [`🤖 <b>الحالة</b> ${s.general.paused ? "⏸ متوقف مؤقتاً" : "▶️ يعمل"}`, ""];
    for (const r of data ?? []) {
      lines.push(`${r.ok ? "✅" : "❌"} ${r.task} — ${r.last_run_at ? new Date(r.last_run_at).toISOString().slice(5, 16).replace("T", " ") : "لم تعمل"}`);
    }
    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  });

  admin.command("tick", async (ctx) => {
    await ctx.reply("⏳ تشغيل دورة المهام...");
    const out = await runTick();
    await ctx.reply(`<pre>${JSON.stringify(out, null, 1).slice(0, 3500).replace(/</g, "&lt;")}</pre>`, { parse_mode: "HTML" });
  });

  // أزرار الموافقة بالخاص: p:a:<id> نشر، p:r:<id> تجاهل
  bot.callbackQuery(/^p:(a|r):([0-9a-f-]{36})$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCallbackQuery({ text: "غير مسموح", show_alert: true });
    const [, action, id] = ctx.match;
    try {
      if (action === "a") {
        const post = await publishPost(id, { force: true });
        await ctx.answerCallbackQuery({ text: post.status === "published" ? "تم النشر ✅" : `الحالة: ${post.status}` });
      } else {
        const { data } = await db()
          .from("posts")
          .update({ status: "rejected", reason: `رفضه ${ctx.from.first_name ?? "المدير"} من تيليجرام` })
          .eq("id", id)
          .in("status", ["pending", "filtered", "duplicate", "scheduled"])
          .select("id");
        await ctx.answerCallbackQuery({ text: data?.length ? "تم التجاهل" : "تمت معالجته مسبقاً" });
      }
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    } catch (err) {
      await ctx.answerCallbackQuery({ text: err instanceof Error ? err.message.slice(0, 180) : "خطأ", show_alert: true });
    }
  });

  bot.catch((err) => console.error("[bot] unhandled error", err.error));
}
