import "server-only";

export interface BotResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export const botConfigured = () => Boolean(process.env.BOT_API_URL && process.env.BOT_API_KEY);

/** يستدعي خدمة البوت (Render/Koyeb). الخدمة المجانية قد تكون نائمة فنعطيها مهلة طويلة */
export async function callBot<T = unknown>(path: string, method: "GET" | "POST" | "PATCH" = "POST", body?: unknown, timeoutMs = 60_000): Promise<BotResult<T>> {
  const url = process.env.BOT_API_URL?.replace(/\/$/, "");
  const key = process.env.BOT_API_KEY;
  if (!url || !key) return { ok: false, error: "خدمة البوت غير مربوطة (BOT_API_URL و BOT_API_KEY)" };
  try {
    const res = await fetch(`${url}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = (await res.json().catch(() => ({}))) as { errors?: string[]; error?: string } & T;
    if (!res.ok) return { ok: false, error: json.errors?.join("، ") ?? json.error ?? `خطأ ${res.status}` };
    return { ok: true, data: json };
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    return { ok: false, error: timeout ? "انتهت المهلة — الخدمة قد تكون نائمة، أعد المحاولة بعد دقيقة" : "تعذّر الاتصال بخدمة البوت" };
  }
}
