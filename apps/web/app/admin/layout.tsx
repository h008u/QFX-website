import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, type ShellNotification } from "@/components/admin/admin-shell";
import { buttonVariants } from "@/components/ui/button";
import { getAdminContext, ROLE_LABEL } from "@/lib/admin/session";
import { loadAdminSettings, loadState } from "@/lib/admin/settings";

export const metadata: Metadata = { title: { default: "لوحة الإدارة", template: "%s | لوحة الإدارة" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">لا تملك صلاحية الدخول للوحة</h1>
        <p className="max-w-md text-sm leading-7 text-muted-foreground">
          حسابك عضو عادي. اطلب من مدير اللوحة إضافتك للفريق (محرر أو مشاهد) من صفحة «الفريق».
        </p>
        <Link href="/" className={buttonVariants()}>
          العودة للموقع
        </Link>
      </div>
    );
  }

  const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [pending, failed, leads, tasks, settings, backup] = await Promise.all([
    ctx.db.from("posts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ctx.db.from("posts").select("id", { count: "exact", head: true }).in("status", ["failed", "partial"]).gte("created_at", since24),
    ctx.db.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    ctx.db.from("task_runs").select("task, ok, error").neq("task", "_tick_lock"),
    loadAdminSettings(ctx),
    loadState<{ at?: string }>(ctx, "backup", {}),
  ]);
  const failingTasks = (tasks.data ?? []).filter((t) => t.ok === false);
  const counts = { pending: pending.count ?? 0, failed: failed.count ?? 0, leads: leads.count ?? 0, tasksFailing: failingTasks.length };

  const notifications: ShellNotification[] = [];
  if (counts.pending) notifications.push({ href: "/admin/review", text: `${counts.pending} منشور ينتظر موافقتك`, tone: "info" });
  if (counts.failed) notifications.push({ href: "/admin/flow?status=failed", text: `${counts.failed} منشور فشل نشره خلال 24 ساعة`, tone: "bad" });
  if (counts.leads) notifications.push({ href: "/admin/crm", text: `${counts.leads} طلب انضمام جديد`, tone: "info" });
  for (const t of failingTasks) notifications.push({ href: "/admin/system", text: `المهمة «${t.task}» متوقفة: ${t.error ?? ""}`.slice(0, 120), tone: "bad" });
  if (!settings.destinations.length) notifications.push({ href: "/admin/settings#destinations", text: "لم تُضف أماكن نشر بعد (يُستخدم TELEGRAM_CHANNEL_ID)", tone: "warn" });
  if (ctx.role === "admin" && (!backup.at || Date.now() - new Date(backup.at).getTime() > 7 * 86400_000)) {
    notifications.push({ href: "/admin/backup", text: "مرّ أكثر من 7 أيام بدون نسخة احتياطية", tone: "warn" });
  }

  return (
    <AdminShell
      user={ctx.user.name}
      roleLabel={ROLE_LABEL[ctx.role]}
      isAdmin={ctx.role === "admin"}
      demo={ctx.demo}
      counts={counts}
      notifications={notifications}
      paused={settings.general.paused}
    >
      {children}
    </AdminShell>
  );
}
