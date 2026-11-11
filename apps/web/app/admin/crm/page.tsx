import { Download } from "lucide-react";
import Link from "next/link";
import { LEAD_STATUS, LeadsTable, type LeadRow } from "@/components/admin/leads-table";
import { PageHeader, Section } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/admin/format";
import { canEdit, getAdminContext, ROLE_LABEL, type StaffRole } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "العملاء والأعضاء" };

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const tz = s.general.timezone;
  const { status = "" } = await searchParams;
  let lq = ctx.db.from("leads").select("*").order("created_at", { ascending: false }).limit(500);
  if (status) lq = lq.eq("status", status);
  const [{ data: leads }, { data: allLeads }, { data: members }] = await Promise.all([
    lq,
    ctx.db.from("leads").select("status"),
    ctx.db.from("profiles").select("id, full_name, telegram_username, role, referral_code, referred_by, created_at").order("created_at", { ascending: false }).limit(500),
  ]);
  const funnel = Object.keys(LEAD_STATUS).map((k) => ({ k, n: (allLeads ?? []).filter((l) => l.status === k).length }));
  const refCount = new Map<string, number>();
  for (const m of members ?? []) if (m.referred_by) refCount.set(m.referred_by, (refCount.get(m.referred_by) ?? 0) + 1);
  const rows: LeadRow[] = ((leads ?? []) as (LeadRow & { created_at: string })[]).map((l) => ({ ...l, createdLabel: fmtDateTime(l.created_at, tz) }));
  const topRef = [...refCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const nameOfCode = new Map((members ?? []).map((m) => [m.referral_code, m.full_name]));

  return (
    <>
      <PageHeader
        title="العملاء والأعضاء"
        description="طلبات الانضمام من الموقع ومراحلها حتى الإيداع، وأعضاء الموقع وإحالاتهم. تحقّق من ارتباط رقم الحساب بوكالتك في بوابة الوسيط ثم حدّث الحالة."
        actions={
          <Link href="/admin/crm/export" className={buttonVariants({ variant: "outline" })}>
            <Download className="h-4 w-4" /> تصدير CSV
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-3 gap-2 md:grid-cols-6">
        {funnel.map(({ k, n }) => (
          <Link key={k} href={status === k ? "/admin/crm" : `/admin/crm?status=${k}`} className={cn("rounded-lg border bg-card p-3 text-center", status === k ? "border-primary" : "border-border hover:border-zinc-600")}>
            <p className="num text-2xl font-bold">{n}</p>
            <p className="mt-1 text-xs text-muted-foreground">{LEAD_STATUS[k].label}</p>
          </Link>
        ))}
      </div>
      <div className="mb-6">
        <Section title={`طلبات الانضمام${status ? ` — ${LEAD_STATUS[status]?.label}` : ""}`}>
          <LeadsTable leads={rows} canEdit={canEdit(ctx.role)} />
        </Section>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Section title={`أعضاء الموقع (${members?.length ?? 0})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-start [&>th]:font-medium">
                    <th>التسجيل</th><th>الاسم</th><th>تيليجرام</th><th>كوده</th><th>جاء عبر</th><th>إحالاته</th>
                  </tr>
                </thead>
                <tbody>
                  {(members ?? []).map((m) => (
                    <tr key={m.id} className="border-t border-border/60 [&>td]:px-3 [&>td]:py-2">
                      <td className="num text-xs text-muted-foreground">{fmtDateTime(m.created_at, tz)}</td>
                      <td>
                        {m.full_name ?? "—"}
                        {m.role !== "member" && <span className="ms-2 rounded bg-primary/15 px-1.5 text-[10px] text-primary">{ROLE_LABEL[m.role as StaffRole]}</span>}
                      </td>
                      <td className="num text-xs">{m.telegram_username ? `@${m.telegram_username}` : "—"}</td>
                      <td className="num text-xs">{m.referral_code}</td>
                      <td className="num text-xs">{m.referred_by ?? "—"}</td>
                      <td className="num">{refCount.get(m.referral_code) ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
        <Section title="🏆 أكثر من أحال">
          <ol className="space-y-2">
            {topRef.map(([code, n], i) => (
              <li key={code} className="flex items-center gap-3 text-sm">
                <span className="num w-5 text-muted-foreground">{i + 1}</span>
                <span className="flex-1">{nameOfCode.get(code) ?? code}</span>
                <span className="num font-bold text-primary">{n}</span>
              </li>
            ))}
            {!topRef.length && <li className="text-sm text-muted-foreground">لا إحالات بعد</li>}
          </ol>
        </Section>
      </div>
    </>
  );
}
