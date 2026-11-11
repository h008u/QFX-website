import {
  CLOSED_STATUSES,
  calcPips,
  detectAssetClass,
  formatSignalMessage,
  formatSignalUpdate,
  normalizeSymbol,
  validateSignalInput,
  type Signal,
  type SignalInput,
  type SignalUpdateInput,
} from "@qfx/shared";
import { getEnv } from "../env";
import { firstMessageId, publishPost } from "../engine/publish";
import type { PostRow } from "../engine/types";
import { db } from "../supabase";

/** ينشئ منشوراً للتوصية وينشره فوراً بكل أماكن النشر التي تقبل التوصيات */
async function publishSignalPost(signalId: string, html: string, replyToPost: string | null, title: string) {
  const { data, error } = await db()
    .from("posts")
    .insert({
      kind: "signal",
      status: "scheduled",
      title,
      body: html,
      format: "html",
      reply_to: replyToPost,
      external_id: replyToPost ? null : `signal:${signalId}`,
      source: "التوصيات",
      scheduled_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return publishPost(data.id);
}

async function openingPostId(signalId: string): Promise<string | null> {
  const { data } = await db().from("posts").select("id").eq("external_id", `signal:${signalId}`).maybeSingle();
  return data?.id ?? null;
}

export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(errors.join("، "));
  }
}

/** ينشئ توصية في قاعدة البيانات ثم ينشرها في قناة تيليجرام (الموقع يستقبلها عبر Realtime) */
export async function createSignal(input: SignalInput): Promise<Signal> {
  const errors = validateSignalInput(input);
  if (errors.length) throw new ValidationError(errors);

  const symbol = normalizeSymbol(input.symbol);
  const row = {
    symbol,
    direction: input.direction,
    entry_price: input.entry_price,
    stop_loss: input.stop_loss,
    take_profit_1: input.take_profit_1,
    take_profit_2: input.take_profit_2 ?? null,
    take_profit_3: input.take_profit_3 ?? null,
    notes: input.notes?.trim() || null,
    asset_class: input.asset_class ?? detectAssetClass(symbol),
    status: input.status ?? "open",
    source: input.source ?? "admin",
  };

  const { data, error } = await db().from("signals").insert(row).select().single<Signal>();
  if (error) throw error;

  try {
    const post: PostRow = await publishSignalPost(
      data.id,
      formatSignalMessage({ ...row, id: data.id }, getEnv().siteUrl),
      null,
      `${row.direction} ${symbol}`,
    );
    const messageId = firstMessageId(post);
    if (messageId) {
      await db().from("signals").update({ telegram_message_id: messageId }).eq("id", data.id);
      data.telegram_message_id = messageId;
    }
  } catch (err) {
    // التوصية محفوظة حتى لو فشل النشر في تيليجرام (تظهر بسجل التدفق مع زر إعادة الإرسال)
    console.error("[signals] telegram publish failed", err);
  }
  return data;
}

/** يبحث عن توصية بالمعرّف الكامل أو بأول 8 أحرف منه (كما يظهر في القناة) */
export async function findSignal(idOrPrefix: string): Promise<Signal | null> {
  const id = idOrPrefix.trim().toLowerCase();
  if (!/^[0-9a-f-]{8,36}$/.test(id)) return null;
  if (id.length === 36) {
    const { data } = await db().from("signals").select().eq("id", id).maybeSingle<Signal>();
    return data;
  }
  // uuid لا يدعم LIKE مباشرة، لذا نبحث في التوصيات الحديثة
  const { data } = await db()
    .from("signals")
    .select()
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Signal[]>();
  return data?.find((s) => s.id.startsWith(id)) ?? null;
}

/** يحدّث حالة التوصية (تحقق الهدف / ضرب الوقف / إغلاق) ويرد على رسالتها في القناة */
export async function updateSignal(idOrPrefix: string, update: SignalUpdateInput): Promise<Signal> {
  const signal = await findSignal(idOrPrefix);
  if (!signal) throw new ValidationError(["التوصية غير موجودة"]);

  let resultPips = update.result_pips ?? null;
  if (resultPips === null && update.exit_price) {
    resultPips = calcPips(signal.symbol, signal.direction, Number(signal.entry_price), update.exit_price);
  }
  if (resultPips === null && update.status === "tp_hit") {
    resultPips = calcPips(signal.symbol, signal.direction, Number(signal.entry_price), Number(signal.take_profit_1));
  }
  if (resultPips === null && update.status === "sl_hit") {
    resultPips = calcPips(signal.symbol, signal.direction, Number(signal.entry_price), Number(signal.stop_loss));
  }

  const patch = {
    status: update.status,
    result_pips: resultPips,
    closed_at: CLOSED_STATUSES.includes(update.status) ? new Date().toISOString() : null,
    ...(update.notes ? { notes: update.notes } : {}),
  };
  const { data, error } = await db().from("signals").update(patch).eq("id", signal.id).select().single<Signal>();
  if (error) throw error;

  try {
    await publishSignalPost(
      data.id,
      formatSignalUpdate({ ...data, notes: update.notes ?? null }),
      await openingPostId(data.id),
      `تحديث ${data.symbol}: ${data.status}`,
    );
  } catch (err) {
    console.error("[signals] telegram update failed", err);
  }
  return data;
}
