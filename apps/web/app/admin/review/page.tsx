import Link from "next/link";
import { ReviewItem, type ReviewPost } from "@/components/admin/review-item";
import { PageHeader } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "المراجعة والموافقة" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const { tab = "pending" } = await searchParams;
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const query =
    tab === "blocked"
      ? ctx.db.from("posts").select("*").in("status", ["filtered", "duplicate"]).gte("created_at", since).not("reason", "like", "أول تشغيل%")
      : ctx.db.from("posts").select("*").eq("status", "pending");
  const { data } = await query.order("created_at", { ascending: false }).limit(50);
  const posts = ((data ?? []) as Omit<ReviewPost, "createdLabel">[]).map((p) => ({ ...p, createdLabel: fmtDateTime((p as unknown as { created_at: string }).created_at, s.general.timezone) }));

  return (
    <>
      <PageHeader
        title="المراجعة والموافقة"
        description="المحتوى الذي ينتظر موافقتك حسب سياسة النشر. عدّل النص وشاهد المعاينة، ثم انشر أو تجاهل. نفس الأزرار تصلك بخاص البوت على تيليجرام."
      />
      <div className="mb-5 flex gap-2">
        {[
          ["pending", "ينتظر الموافقة"],
          ["blocked", "انفلتر أو مكرر (48 ساعة)"],
        ].map(([k, label]) => (
          <Link key={k} href={`/admin/review?tab=${k}`} className={cn("rounded-full border px-4 py-1.5 text-sm", tab === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
            {label}
          </Link>
        ))}
      </div>
      <div className="space-y-4">
        {posts.map((p) => (
          <ReviewItem key={p.id} post={p} signature={s.general.signature} disclaimer={s.general.disclaimer} canEdit={canEdit(ctx.role)} />
        ))}
        {!posts.length && <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">لا شيء هنا 🎉</div>}
      </div>
    </>
  );
}
