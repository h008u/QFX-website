import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { RunTickButton } from "@/components/admin/run-tick-button";
import { PageHeader, Section } from "@/components/admin/ui";
import { botConfigured, callBot } from "@/lib/admin/bot-api";
import { fmtDateTime } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "صحة النظام" };

const TASK_LABEL: Record<string, string> = {
  publish_due: "نشر المجدول",
  news: "جلب الأخبار",
  calendar_sync: "مزامنة المفكرة",
  event_alerts: "تنبيهات قبل الأخبار",
  price_alerts: "تنبيهات الأسعار",
  greetings: "التحيات",
  agenda: "أجندة اليوم",
  weekly: "ملخص الأسبوع",
};

interface Status {
  bot?: { username?: string; first_name?: string; error?: string };
  webhook?: { url: string; pending: number; last_error: string | null; last_error_date: number | null } | null;
  paused?: boolean;
  env?: { prices: boolean; admins: number; tradingview: boolean };
  memory?: { rss_mb: number; uptime_s: number };
}

export default async function SystemPage() {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const tz = s.general.timezone;
  const [{ data: tasks }, status] = await Promise.all([
    ctx.db.from("task_runs").select("*").neq("task", "_tick_lock").order("task"),
    ctx.demo || !botConfigured() ? Promise.resolve(null) : callBot<Status>("/status", "GET", undefined, 45_000),
  ]);
  const st = status?.ok ? status.data : null;
  const lastTick = (tasks ?? []).map((t) => t.last_run_at).filter(Boolean).sort().at(-1) as string | undefined;
  const tickAge = lastTick ? Math.round((Date.now() - new Date(lastTick).getTime()) / 60000) : null;

  const checks = [
    { label: "خدمة البوت", ok: ctx.demo ? null : Boolean(st), detail: ctx.demo ? "وضع المعاينة" : st ? `@${st.bot?.username ?? "?"}` : status?.error ?? "BOT_API_URL غير مضبوط" },
    { label: "Webhook تيليجرام", ok: st ? Boolean(st.webhook?.url) && !st.webhook?.last_error : null, detail: st?.webhook ? (st.webhook.last_error ? `آخر خطأ: ${st.webhook.last_error}` : `${st.webhook.pending} تحديث معلّق`) : "—" },
    { label: "دورة المهام", ok: tickAge === null ? null : tickAge <= 15, detail: tickAge === null ? "لم تعمل بعد — اضبط cron كل 5 دقائق" : `آخر تشغيل قبل ${tickAge} دقيقة` },
    { label: "مدراء البوت (أزرار الموافقة)", ok: st ? (st.env?.admins ?? 0) > 0 : null, detail: st ? `${st.env?.admins ?? 0} حساب في TELEGRAM_ADMIN_IDS` : "—" },
    { label: "أسعار Twelve Data", ok: st ? Boolean(st.env?.prices) : null, detail: st ? (st.env?.prices ? "مفعّلة" : "أضف TWELVEDATA_API_KEY في البوت") : "—" },
    { label: "النشر التلقائي", ok: !s.general.paused, detail: s.general.paused ? "متوقف مؤقتاً" : "يعمل" },
  ];

  return (
    <>
      <PageHeader title="صحة النظام" description="حالة خدمة البوت والـ Webhook وكل مهمة آلية: متى اشتغلت آخر مرة، وهل نجحت، وآخر خطأ. بعد 3 إخفاقات متتالية يصلك تنبيه على تيليجرام." actions={canEdit(ctx.role) && <RunTickButton />} />
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((c) => (
          <div key={c.label} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            {c.ok === null ? <CircleDashed className="h-5 w-5 shrink-0 text-muted-foreground" /> : c.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold">{c.label}</p>
              <p className="mt-0.5 break-words text-xs text-muted-foreground">{c.detail}</p>
            </div>
          </div>
        ))}
      </div>
      {st?.memory && (
        <p className="num mb-6 text-xs text-muted-foreground">
          ذاكرة الخدمة: {st.memory.rss_mb}MB • تعمل منذ {Math.round(st.memory.uptime_s / 60)} دقيقة (الخطة المجانية تنام بعد 15 دقيقة بدون طلبات)
        </p>
      )}
      <Section title="المهام الآلية">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-start [&>th]:font-medium">
                <th>المهمة</th><th>الحالة</th><th>آخر تشغيل</th><th>مرات التشغيل</th><th>آخر نتيجة / خطأ</th>
              </tr>
            </thead>
            <tbody>
              {(tasks ?? []).map((t) => (
                <tr key={t.task} className="border-t border-border/60 align-top [&>td]:px-3 [&>td]:py-2.5">
                  <td className="font-semibold">{TASK_LABEL[t.task] ?? t.task}<span className="num block text-[11px] font-normal text-muted-foreground">{t.task}</span></td>
                  <td>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", t.ok ? "bg-success/15 text-success" : t.ok === false ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground")}>
                      {t.ok ? "يعمل" : t.ok === false ? `فشل ×${t.failures}` : "—"}
                    </span>
                  </td>
                  <td className="num text-xs">{fmtDateTime(t.last_run_at, tz)}</td>
                  <td className="num text-xs text-muted-foreground">{t.runs}</td>
                  <td className="max-w-md">
                    <code className={cn("num block max-h-20 overflow-auto whitespace-pre-wrap break-all text-[11px]", t.ok === false ? "text-destructive" : "text-muted-foreground")} dir="ltr">
                      {t.error ?? (t.result ? JSON.stringify(t.result) : "—")}
                    </code>
                  </td>
                </tr>
              ))}
              {!tasks?.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لم تعمل أي مهمة بعد</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
