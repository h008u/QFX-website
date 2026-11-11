import type { Direction, NewsInput, SignalInput, SignalUpdateInput } from "@qfx/shared";
import { parseSignalCommand } from "@qfx/shared";
import { webhookCallback } from "grammy";
import { Hono, type Context } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { timingSafeEqual } from "node:crypto";
import { registerCommands } from "./commands";
import { getEnv } from "./env";
import { invalidateSettings, loadSettings } from "./engine/config";
import { postGreeting, type GreetingType } from "./engine/greetings";
import { checkSources, runNews } from "./engine/news";
import { publishPost } from "./engine/publish";
import { publishDue, runTick } from "./engine/tick";
import { postWeekly } from "./engine/weekly";
import { postOutlook } from "./engine/outlook";
import { handleMt5Event, type Mt5Event } from "./engine/mt5";
import { runViews } from "./engine/views";
import { runAgenda, runEventAlerts, syncCalendar } from "./services/calendar";
import { db } from "./supabase";
import { createNews } from "./services/news";
import { ValidationError, createSignal, updateSignal } from "./services/signals";
import { intake } from "./engine/intake";
import { validateSignalInput } from "@qfx/shared";
import { getBot } from "./telegram";

const toNum = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** يحوّل جسم JSON (من لوحة التحكم أو TradingView) إلى SignalInput */
function signalFromBody(body: Record<string, unknown>, source: SignalInput["source"]): SignalInput {
  const direction = String(body.direction ?? body.side ?? "").toUpperCase() as Direction;
  return {
    symbol: String(body.symbol ?? body.ticker ?? ""),
    direction,
    entry_price: toNum(body.entry_price ?? body.entry ?? body.price) ?? NaN,
    stop_loss: toNum(body.stop_loss ?? body.sl) ?? NaN,
    take_profit_1: toNum(body.take_profit_1 ?? body.tp1 ?? body.tp) ?? NaN,
    take_profit_2: toNum(body.take_profit_2 ?? body.tp2) ?? null,
    take_profit_3: toNum(body.take_profit_3 ?? body.tp3) ?? null,
    notes: typeof body.notes === "string" ? body.notes : null,
    source,
  };
}

export function createApp() {
  const env = getEnv();
  const bot = getBot();
  registerCommands(bot);

  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof ValidationError) return c.json({ ok: false, errors: err.errors }, 400);
    if ("getResponse" in err && typeof err.getResponse === "function") return err.getResponse();
    console.error("[http] error", err);
    return c.json({ ok: false, error: "internal_error" }, 500);
  });

  // فحص الصحة — تستخدمه Render/Koyeb ومهام الإيقاظ
  app.get("/", (c) => c.json({ ok: true, service: "qfx-bot" }));
  app.get("/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

  // ===== Telegram Webhook (يتحقق من X-Telegram-Bot-Api-Secret-Token) =====
  // نتحقق من السر قبل تمرير الطلب لـ grammY (الذي يستدعي getMe قبل فحص السر)
  const telegramHandler = webhookCallback(bot, "hono", { secretToken: env.webhookSecret });
  app.post("/telegram/webhook", async (c) => {
    const header = c.req.header("X-Telegram-Bot-Api-Secret-Token") ?? "";
    if (!safeEqual(header, env.webhookSecret)) return c.json({ ok: false, error: "unauthorized" }, 401);
    return telegramHandler(c);
  });

  // ===== TradingView Alerts =====
  // الرابط: POST {PUBLIC_URL}/webhooks/tradingview?secret=...
  // الجسم JSON: {"symbol":"{{ticker}}","direction":"BUY","entry":{{close}},"sl":..,"tp":..}
  // أو نص بنفس صيغة أمر /signal مثل: BUY XAUUSD 2350 SL 2340 TP 2360
  app.post("/webhooks/tradingview", async (c) => {
    if (!env.tradingViewSecret) return c.json({ ok: false, error: "tradingview_disabled" }, 404);
    const raw = await c.req.text();
    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    const secret = c.req.query("secret") ?? (typeof body?.secret === "string" ? body.secret : "");
    if (!safeEqual(secret, env.tradingViewSecret)) return c.json({ ok: false, error: "unauthorized" }, 401);

    const settings = await loadSettings();
    if (!settings.tradingview.enabled) return c.json({ ok: false, error: "tradingview_disabled_in_panel" }, 403);

    let input: SignalInput | null = null;
    if (body) {
      input = signalFromBody(body, "tradingview");
    } else {
      const parsed = parseSignalCommand(raw);
      if (parsed.ok) input = { ...parsed.value, source: "tradingview" };
    }
    // تنبيه كامل (اتجاه + دخول + وقف + هدف) ← توصية. غير ذلك ← منشور تنبيه يمر على سياسة النشر
    if (input && !validateSignalInput(input).length) {
      const signal = await createSignal(input);
      return c.json({ ok: true, signal }, 201);
    }
    const title = typeof body?.title === "string" ? body.title : "تنبيه TradingView";
    const text = body ? [body.text, body.message, body.ticker && `الرمز: ${body.ticker}`, body.price && `السعر: ${body.price}`].filter(Boolean).join("\n") : raw;
    const r = await intake(
      {
        kind: "tradingview",
        title: String(title).slice(0, 200),
        body: `🔔 **${String(title).slice(0, 200)}**\n\n${String(text).slice(0, 3000)}`,
        score: 70,
        policy: "tradingview",
        disclaimer: true,
      },
      settings,
    );
    return c.json({ ok: true, outcome: r.outcome }, 201);
  });

  // ===== جسر MT5 (إضافة QFXBridge.mq5) =====
  // الرابط: POST {PUBLIC_URL}/mt5/{MT5_SECRET} — الإضافة ترسل JSON لكل حدث بالحساب
  app.post("/mt5/:secret", async (c) => {
    const secret = process.env.MT5_SECRET ?? "";
    if (!secret || !safeEqual(c.req.param("secret"), secret)) return c.json({ ok: false, error: "unauthorized" }, 401);
    const e = (await c.req.json().catch(() => null)) as Mt5Event | null;
    if (!e?.type) return c.json({ ok: false, error: "bad_json" }, 400);
    if (e.type === "ping") return c.json({ ok: true, pong: true });
    const r = await handleMt5Event(e, await loadSettings());
    return c.json(r);
  });

  // ===== واجهة API الخاصة (لوحة التحكم + المهام الدورية) =====
  const api = new Hono();
  api.use("*", bearerAuth({ token: env.botApiKey }));

  api.post("/signals", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const signal = await createSignal(signalFromBody(body, "admin"));
    return c.json({ ok: true, signal }, 201);
  });

  api.patch("/signals/:id", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const allowed: SignalUpdateInput["status"][] = ["open", "tp_hit", "sl_hit", "closed", "cancelled"];
    const status = body.status as SignalUpdateInput["status"];
    if (!allowed.includes(status)) throw new ValidationError(["حالة غير صالحة"]);
    const signal = await updateSignal(c.req.param("id"), {
      status,
      exit_price: toNum(body.exit_price) ?? null,
      result_pips: toNum(body.result_pips) ?? null,
      notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    });
    return c.json({ ok: true, signal });
  });

  api.post("/news", async (c) => {
    const body = await c.req.json<NewsInput & { publish?: boolean }>();
    const news = await createNews(body, { publish: body.publish !== false });
    return c.json({ ok: true, news }, 201);
  });

  // ===== المنشورات =====
  // نشر الآن / الموافقة / إعادة الإرسال للأماكن التي فشلت
  api.post("/posts/:id/publish", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { only_failed?: boolean; force?: boolean; approved_by?: string };
    const post = await publishPost(c.req.param("id"), {
      onlyFailed: Boolean(body.only_failed),
      force: Boolean(body.force),
      approvedBy: body.approved_by ?? null,
    });
    return c.json({ ok: true, post });
  });

  // ===== المهام الآلية =====
  // تُستدعى كل 5 دقائق (cron-job.org / GitHub Actions) — توقظ الخدمة المجانية وتشغّل المستحق
  const tick = async (c: Context) => {
    const body = (await c.req.json().catch(() => ({}))) as { only?: string[] };
    return c.json({ ok: true, result: await runTick(new Date(), body.only) });
  };
  api.post("/jobs/tick", tick);
  api.post("/jobs/calendar", tick); // توافق مع الإصدار السابق

  // تجربة فورية لأي قسم (مثل /test في Spir)
  api.post("/test/:what", async (c) => {
    const s = await loadSettings(true);
    const now = new Date();
    const what = c.req.param("what");
    const runners: Record<string, () => Promise<unknown>> = {
      morning: () => postGreeting("morning" as GreetingType, s, now, true),
      open: () => postGreeting("open", s, now, true),
      close: () => postGreeting("close", s, now, true),
      agenda: async () => {
        await syncCalendar(s).catch(() => undefined);
        await db().from("posts").delete().eq("external_id", `agenda:${now.toISOString().slice(0, 10)}`).eq("status", "filtered");
        return runAgenda(s, now);
      },
      weekly: () => postWeekly(s, now, true),
      outlook: () => postOutlook(s, now, true),
      views: () => runViews(s),
      news: () => runNews(s, now),
      calendar: () => syncCalendar(s),
      alerts: () => runEventAlerts(s, now),
      due: () => publishDue(now),
    };
    const run = runners[what];
    if (!run) throw new ValidationError(["قسم غير معروف"]);
    return c.json({ ok: true, result: await run() });
  });

  // ===== الحالة والفحوصات =====
  api.get("/status", async (c) => {
    const s = await loadSettings(true);
    const api_ = bot.api;
    const [me, webhook] = await Promise.all([api_.getMe().catch((e) => ({ error: String(e) })), api_.getWebhookInfo().catch(() => null)]);
    const { data: tasks } = await db().from("task_runs").select("*").neq("task", "_tick_lock");
    return c.json({
      ok: true,
      bot: me,
      webhook: webhook && { url: webhook.url, pending: webhook.pending_update_count, last_error: webhook.last_error_message ?? null, last_error_date: webhook.last_error_date ?? null },
      paused: s.general.paused,
      tasks: tasks ?? [],
      env: { prices: Boolean(env.twelveDataKey), admins: env.adminIds.size, tradingview: Boolean(env.tradingViewSecret) },
      memory: { rss_mb: Math.round(process.memoryUsage().rss / 1048576), uptime_s: Math.round(process.uptime()) },
    });
  });

  // يتأكد أن البوت أدمن بالقناة أو عضو بالمجموعة (وأن المجموعة فيها مواضيع إذا حددت موضوعاً)
  api.post("/destinations/check", async (c) => {
    const { chat_id, thread_id } = (await c.req.json()) as { chat_id: string; thread_id?: number | null };
    try {
      const chat = await bot.api.getChat(chat_id);
      const me = await bot.api.getMe();
      const member = await bot.api.getChatMember(chat_id, me.id);
      const problems: string[] = [];
      if (chat.type === "channel" && !(member.status === "administrator" && (member as { can_post_messages?: boolean }).can_post_messages !== false)) {
        problems.push("البوت ليس أدمن في القناة أو لا يملك صلاحية النشر");
      }
      if (chat.type !== "channel" && !["administrator", "member", "creator"].includes(member.status)) problems.push("البوت ليس عضواً في المجموعة");
      if (thread_id && !(chat as { is_forum?: boolean }).is_forum) problems.push("المجموعة لا تحتوي مواضيع (Topics)");
      return c.json({ ok: problems.length === 0, title: (chat as { title?: string }).title ?? chat_id, type: chat.type, problems });
    } catch (e) {
      return c.json({ ok: false, problems: [e instanceof Error ? e.message : String(e)] });
    }
  });

  api.get("/news/sources", async (c) => c.json({ ok: true, sources: await checkSources(await loadSettings()) }));

  api.post("/settings/invalidate", (c) => {
    invalidateSettings();
    return c.json({ ok: true });
  });

  app.route("/api", api);
  return app;
}
