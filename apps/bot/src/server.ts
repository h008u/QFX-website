import type { Direction, NewsInput, SignalInput, SignalUpdateInput } from "@qfx/shared";
import { parseSignalCommand } from "@qfx/shared";
import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { timingSafeEqual } from "node:crypto";
import { registerCommands } from "./commands";
import { getEnv } from "./env";
import { runCalendarJob } from "./services/calendar";
import { createNews } from "./services/news";
import { ValidationError, createSignal, updateSignal } from "./services/signals";
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

    let input: SignalInput;
    if (body) {
      input = signalFromBody(body, "tradingview");
    } else {
      const parsed = parseSignalCommand(raw);
      if (!parsed.ok) return c.json({ ok: false, errors: [parsed.error] }, 400);
      input = { ...parsed.value, source: "tradingview" };
    }
    const signal = await createSignal(input);
    return c.json({ ok: true, signal }, 201);
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

  // تُستدعى دورياً (GitHub Actions / cron-job.org) — توقظ الخدمة المجانية وتنشر المفكرة
  api.post("/jobs/calendar", async (c) => c.json({ ok: true, ...(await runCalendarJob()) }));

  app.route("/api", api);
  return app;
}
