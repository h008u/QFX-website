import { isSlotDue, type BotSettings } from "@qfx/shared";
import { runAgenda, runEventAlerts, syncCalendar } from "../services/calendar";
import { db } from "../supabase";
import { runPriceAlerts } from "./alerts";
import { messageAdmins } from "./approvals";
import { getState, loadSettings, setState } from "./config";
import { holidayOf, runGreetings } from "./greetings";
import { runNews } from "./news";
import { publishPost } from "./publish";
import { runWeekly } from "./weekly";

interface TaskRun {
  task: string;
  last_run_at: string | null;
  ok: boolean | null;
  failures: number;
  runs: number;
}

/** يسجّل نتيجة المهمة؛ بعد 3 إخفاقات متتالية يوصل تنبيه للمدراء (مثل تنبيهات الصحة في Spir) */
async function record(task: string, prev: TaskRun | undefined, ok: boolean, result: unknown, error?: string) {
  const failures = ok ? 0 : (prev?.failures ?? 0) + 1;
  await db().from("task_runs").upsert({
    task,
    last_run_at: new Date().toISOString(),
    ok,
    error: error ?? null,
    result: (result ?? null) as never,
    runs: (prev?.runs ?? 0) + 1,
    failures,
  });
  if (failures === 3) await messageAdmins(`🩺 <b>المهمة "${task}" فشلت 3 مرات متتالية</b>\n<code>${(error ?? "").slice(0, 500)}</code>`);
  if (ok && (prev?.failures ?? 0) >= 3) await messageAdmins(`✅ المهمة "${task}" رجعت تشتغل.`);
}

/** ينشر المنشورات المجدولة المستحقة. بعد ساعات الهدوء ينشر آخر 5 أخبار فقط حتى لا تنغرق القناة */
export async function publishDue(now = new Date()) {
  const { data, error } = await db()
    .from("posts")
    .select("id, kind, reason, score, created_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", now.toISOString())
    .order("scheduled_at")
    .limit(50);
  if (error) throw error;
  const rows = data ?? [];
  const quietNews = rows.filter((r) => r.kind === "news" && r.reason === "ساعات الهدوء");
  const drop = new Set(
    quietNews
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(5)
      .map((r) => r.id),
  );
  if (drop.size) {
    await db().from("posts").update({ status: "filtered", reason: "تجاوز حد الأخبار بعد ساعات الهدوء" }).in("id", [...drop]);
  }
  let published = 0;
  let failed = 0;
  for (const r of rows.filter((x) => !drop.has(x.id))) {
    try {
      const p = await publishPost(r.id);
      p.status === "failed" ? failed++ : published++;
    } catch {
      failed++; // حالته تغيّرت (نُشر من مكان آخر)
    }
  }
  return { due: rows.length, published, failed, dropped: drop.size };
}

type Runner = (s: BotSettings, now: Date) => Promise<unknown>;

/** قائمة المهام: كل وحدة إلها شرط تشغيل */
function tasks(s: BotSettings): { id: string; everyMin: number; enabled: boolean; run: Runner }[] {
  return [
    { id: "publish_due", everyMin: 0, enabled: true, run: (_s, now) => publishDue(now) },
    { id: "news", everyMin: s.news.interval_min, enabled: s.news.enabled, run: runNews },
    { id: "calendar_sync", everyMin: 60, enabled: true, run: (s) => syncCalendar(s) },
    { id: "event_alerts", everyMin: 0, enabled: s.calendar.pre_alert_enabled, run: runEventAlerts },
    { id: "price_alerts", everyMin: 4, enabled: true, run: runPriceAlerts },
    { id: "greetings", everyMin: 0, enabled: true, run: runGreetings },
    { id: "agenda", everyMin: 0, enabled: s.calendar.agenda_enabled, run: runAgendaIfDue },
    { id: "weekly", everyMin: 0, enabled: s.weekly.enabled, run: runWeekly },
  ];
}

async function runAgendaIfDue(s: BotSettings, now: Date) {
  if (holidayOf(s, now)) return { skipped: "holiday" };
  const st = await getState<{ last_date?: string }>("agenda", {});
  const { due, date } = isSlotDue({ now, timeZone: s.general.timezone, time: s.calendar.agenda_time, days: [1, 2, 3, 4, 5], lastRunDate: st.last_date });
  if (!due) return { skipped: "not_due" };
  const r = await runAgenda(s, now);
  await setState("agenda", { last_date: date });
  return r;
}

/** يحجز التشغيل حتى لا تشتغل دورتان سوا (GitHub Actions + cron-job.org مثلاً) */
async function acquireLock(now: Date): Promise<boolean> {
  await db().from("task_runs").upsert({ task: "_tick_lock" }, { onConflict: "task", ignoreDuplicates: true });
  const stale = new Date(now.getTime() - 4 * 60_000).toISOString();
  const { data } = await db()
    .from("task_runs")
    .update({ last_run_at: now.toISOString() })
    .eq("task", "_tick_lock")
    .or(`last_run_at.is.null,last_run_at.lt.${stale}`)
    .select("task");
  return Boolean(data?.length);
}

async function releaseLock() {
  await db().from("task_runs").update({ last_run_at: null }).eq("task", "_tick_lock");
}

/** دورة المهام الآلية — تُستدعى كل 5 دقائق من خدمة cron خارجية (وتوقظ الخدمة المجانية) */
export async function runTick(now = new Date(), only?: string[]) {
  if (!(await acquireLock(now))) return { skipped: "another tick is running" };
  try {
    const s = await loadSettings(true);
    const { data } = await db().from("task_runs").select("task, last_run_at, ok, failures, runs");
    const prev = new Map((data ?? []).map((r) => [r.task, r as TaskRun]));
    const out: Record<string, unknown> = {};
    for (const t of tasks(s)) {
      if (only && !only.includes(t.id)) continue;
      if (!t.enabled) continue;
      const last = prev.get(t.id)?.last_run_at;
      if (!only && t.everyMin && last && now.getTime() - new Date(last).getTime() < (t.everyMin - 0.5) * 60_000) continue;
      try {
        const result = await t.run(s, now);
        out[t.id] = result;
        await record(t.id, prev.get(t.id), true, result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[tick] ${t.id}`, msg);
        out[t.id] = { error: msg };
        await record(t.id, prev.get(t.id), false, null, msg);
      }
    }
    return out;
  } finally {
    await releaseLock();
  }
}
