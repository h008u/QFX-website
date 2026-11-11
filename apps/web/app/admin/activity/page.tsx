import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/admin/format";
import { getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "سجل النشاط" };

const ACTION_LABEL: Record<string, string> = {
  "post.publish": "نشر منشوراً",
  "post.force_publish": "نشر عنصراً مفلتراً",
  "post.resend": "أعاد الإرسال",
  "post.reject": "رفض منشوراً",
  "post.edit": "عدّل منشوراً",
  "post.reschedule": "غيّر موعد منشور",
  "post.cancel": "ألغى جدولة",
  "post.create_publish": "كتب ونشر",
  "post.schedule": "جدول منشوراً",
  "post.draft": "حفظ مسودة",
  "signal.create": "أرسل توصية",
  "signal.update": "حدّث توصية",
  "settings.save": "غيّر الإعدادات",
  "alert.create": "أضاف تنبيه سعر",
  "alert.delete": "حذف تنبيه سعر",
  "alert.enable": "فعّل تنبيهاً",
  "alert.disable": "أوقف تنبيهاً",
  "lead.update": "حدّث عميلاً",
  "media.upload": "رفع صوراً",
  "media.delete": "حذف صورة",
  "team.role": "غيّر دور عضو",
  "backup.export": "نزّل نسخة احتياطية",
  "backup.restore": "استرجع نسخة",
  "test.run": "شغّل تجربة",
  "tick.run": "شغّل المهام",
  login: "دخل اللوحة",
};

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ actor?: string; action?: string }> }) {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const { actor = "", action = "" } = await searchParams;
  let q = ctx.db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(300);
  if (actor) q = q.eq("actor_email", actor);
  if (action) q = q.like("action", `${action}%`);
  const [{ data }, { data: actors }] = await Promise.all([q, ctx.db.from("audit_log").select("actor_email").limit(2000)]);
  const people = [...new Set((actors ?? []).map((a) => a.actor_email).filter(Boolean))] as string[];
  const groups = ["post", "signal", "settings", "alert", "lead", "media", "team", "backup"];
  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ actor, action, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/activity${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title="سجل النشاط" description="كل تغيير في اللوحة: من سوّاه، ومتى، ومن أي عنوان." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={link({ actor: "" })} className={cn("rounded-full border px-3 py-1.5 text-xs", !actor ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>الكل</Link>
        {people.map((p) => (
          <Link key={p} href={link({ actor: p })} className={cn("rounded-full border px-3 py-1.5 text-xs", actor === p ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>{p}</Link>
        ))}
        <span className="mx-1 w-px bg-border" />
        {groups.map((g) => (
          <Link key={g} href={link({ action: action === g ? "" : g })} className={cn("num rounded-full border px-3 py-1.5 text-xs", action === g ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>{g}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-medium">
              <th>الوقت</th><th>من</th><th>ماذا</th><th>على</th><th>العنوان</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id} className="border-t border-border/60 [&>td]:px-4 [&>td]:py-2.5">
                <td className="num whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(a.created_at, s.general.timezone)}</td>
                <td className="font-semibold">{a.actor_email ?? "—"}</td>
                <td>{ACTION_LABEL[a.action] ?? a.action}<span className="num ms-2 text-[10px] text-muted-foreground">{a.action}</span></td>
                <td className="max-w-xs truncate text-muted-foreground">{a.target ?? "—"}</td>
                <td className="num text-xs text-muted-foreground">{a.ip ?? "—"}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">لا نشاط</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
