import type { PolicyKind } from "@qfx/shared";
import { PolicySection, TemplatesSection, WordsSection } from "@/components/admin/settings/rules-sections";
import { PageHeader } from "@/components/admin/ui";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";

export const metadata = { title: "القواعد والقوالب" };

const KIND_MAP: Record<PolicyKind, string[]> = {
  news: ["news"],
  tradingview: ["tradingview"],
  agenda: ["agenda", "event_alert"],
  price_alert: ["price_alert"],
};

export default async function RulesPage() {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const { data } = await ctx.db
    .from("posts")
    .select("kind, score")
    .not("score", "is", null)
    .gte("created_at", new Date(Date.now() - 14 * 86400_000).toISOString())
    .limit(2000);
  const scores = Object.fromEntries(
    (Object.keys(KIND_MAP) as PolicyKind[]).map((k) => [k, (data ?? []).filter((r) => KIND_MAP[k].includes(r.kind)).map((r) => Number(r.score))]),
  ) as Record<PolicyKind, number[]>;
  const edit = canEdit(ctx.role);
  return (
    <>
      <PageHeader title="القواعد والقوالب" description="ماذا ينزل تلقائياً وماذا ينتظر موافقتك، والكلمات الممنوعة والمطلوبة والمراقبة، وساعات الهدوء، وقوالب المنشورات." />
      <div className="space-y-6">
        <PolicySection initial={s.policy} scores={scores} canEdit={edit} />
        <WordsSection initial={s.rules} canEdit={edit} />
        <TemplatesSection initial={s.templates} canEdit={edit} />
      </div>
    </>
  );
}
