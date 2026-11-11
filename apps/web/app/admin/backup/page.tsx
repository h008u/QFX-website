import { Download } from "lucide-react";
import { redirect } from "next/navigation";
import { RestoreForm } from "@/components/admin/restore-form";
import { PageHeader, Section } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/admin/format";
import { getAdminContext } from "@/lib/admin/session";
import { loadState } from "@/lib/admin/settings";

export const metadata = { title: "النسخ الاحتياطي" };

export default async function BackupPage() {
  const ctx = (await getAdminContext())!;
  if (ctx.role !== "admin") redirect("/admin");
  const last = await loadState<{ at?: string }>(ctx, "backup", {});
  const old = !last.at || Date.now() - new Date(last.at).getTime() > 7 * 86400_000;
  return (
    <>
      <PageHeader title="النسخ الاحتياطي" description="نسخة كاملة من إعدادات البوت والقوالب وتنبيهات الأسعار والتوصيات والعملاء. لا تحتوي التوكنات أو المفاتيح (تبقى في متغيرات البيئة)." />
      <div className="space-y-6">
        <Section title="💾 تنزيل نسخة كاملة" description={`آخر نسخة: ${last.at ? fmtDateTime(last.at) : "لم تُنزّل بعد"}`}>
          {old && <p className="mb-3 text-sm text-gold">مرّ أكثر من 7 أيام بدون نسخة — يُنصح بتنزيل واحدة الآن.</p>}
          <a href="/admin/backup/export" className={buttonVariants()}>
            <Download className="h-4 w-4" /> تنزيل النسخة (JSON)
          </a>
          <p className="mt-3 text-xs text-muted-foreground">Supabase يأخذ أيضاً نسخة يومية تلقائية لقاعدة البيانات في الخطط المدفوعة؛ في المجانية احتفظ بهذا الملف بمكان آمن.</p>
        </Section>
        <Section title="♻️ استرجاع نسخة" description="يستبدل أقسام الإعدادات الموجودة في الملف (بعد التحقق من كل قيمة) ويضيف تنبيهات الأسعار. التوصيات والعملاء لا تُستبدل.">
          <RestoreForm />
        </Section>
      </div>
    </>
  );
}
