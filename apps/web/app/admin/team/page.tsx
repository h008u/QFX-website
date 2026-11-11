import { redirect } from "next/navigation";
import { AddMemberForm, RoleSelect } from "@/components/admin/team-ui";
import { PageHeader, Section } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/admin/format";
import { getAdminContext, ROLE_LABEL, type StaffRole } from "@/lib/admin/session";

export const metadata = { title: "الفريق" };

export default async function TeamPage() {
  const ctx = (await getAdminContext())!;
  if (ctx.role !== "admin") redirect("/admin");
  const { data } = await ctx.db.from("profiles").select("id, full_name, telegram_username, role, created_at").order("created_at");
  const staff = (data ?? []).filter((p) => p.role !== "member");
  const members = (data ?? []).filter((p) => p.role === "member").slice(0, 50);
  return (
    <>
      <PageHeader
        title="الفريق"
        description="المدير يتحكم بكل شيء. المحرر يكتب وينشر ويوافق ويغيّر المحتوى والإعدادات، بدون إدارة الفريق والنسخ الاحتياطي. المشاهد يرى فقط. كل إجراء يُسجَّل باسم صاحبه."
      />
      <div className="space-y-6">
        <Section title="إضافة عضو للفريق" description="الشخص يسجّل دخوله للموقع مرة واحدة من /login، ثم تضيفه هنا ببريده.">
          <AddMemberForm />
        </Section>
        <Section title={`الفريق (${staff.length})`}>
          <ul className="divide-y divide-border">
            {staff.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.full_name ?? "—"} <span className="ms-2 rounded bg-primary/15 px-1.5 text-[11px] text-primary">{ROLE_LABEL[p.role as StaffRole]}</span></p>
                  <p className="num text-xs text-muted-foreground">{p.telegram_username ? `@${p.telegram_username} • ` : ""}منذ {fmtDateTime(p.created_at)}</p>
                </div>
                <RoleSelect id={p.id} role={p.role} self={p.id === ctx.user.id} />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="ترقية عضو من الموقع" description="آخر 50 عضواً مسجّلاً.">
          <ul className="divide-y divide-border">
            {members.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <p className="min-w-0 flex-1 text-sm">{p.full_name ?? "—"} <span className="num text-xs text-muted-foreground">{p.telegram_username ? `@${p.telegram_username}` : ""}</span></p>
                <RoleSelect id={p.id} role={p.role} self={false} />
              </li>
            ))}
            {!members.length && <li className="py-4 text-sm text-muted-foreground">لا أعضاء</li>}
          </ul>
        </Section>
      </div>
    </>
  );
}
