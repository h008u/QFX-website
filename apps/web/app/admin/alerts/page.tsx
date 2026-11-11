import { AlertsTable, NewAlertForm, type AlertRow } from "@/components/admin/alerts-ui";
import { PageHeader, Section } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";

export const metadata = { title: "تنبيهات الأسعار" };

export default async function AlertsPage() {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const [{ data }, { data: run }] = await Promise.all([
    ctx.db.from("price_alerts").select("*").order("created_at", { ascending: false }),
    ctx.db.from("task_runs").select("ok, error").eq("task", "price_alerts").maybeSingle(),
  ]);
  const tz = s.general.timezone;
  const alerts: AlertRow[] = (data ?? []).map((a) => ({
    ...a,
    checkedLabel: fmtDateTime(a.last_checked_at, tz),
    triggeredLabel: a.triggered_at ? fmtDateTime(a.triggered_at, tz) : null,
  }));
  return (
    <>
      <PageHeader title="تنبيهات الأسعار" description="بدون حساب TradingView: اكتب «إذا XAUUSD صعد فوق 2400» والبوت يراقب السعر بنفسه وينشر التنبيه عند تحققه." />
      {run?.ok === false && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{run.error}</p>
      )}
      {canEdit(ctx.role) && (
        <div className="mb-6">
          <Section title="تنبيه جديد" description="الأسعار من Twelve Data (خطة مجانية). سياسة نشر التنبيهات تتحدد من «القواعد والقوالب».">
            <NewAlertForm />
          </Section>
        </div>
      )}
      <AlertsTable alerts={alerts} canEdit={canEdit(ctx.role)} />
    </>
  );
}
