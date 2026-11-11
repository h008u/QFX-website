import { Composer } from "@/components/admin/composer";
import { PageHeader } from "@/components/admin/ui";
import { toLocalInput } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";
import { listMedia } from "@/lib/admin/media";

export const metadata = { title: "منشور جديد" };

export default async function ComposePage() {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const media = await listMedia(ctx);
  if (!canEdit(ctx.role)) return <PageHeader title="منشور جديد" description="دورك «مشاهد» — لا يمكنك النشر." />;
  return (
    <>
      <PageHeader title="منشور جديد" description="اكتب منشوراً أو تحليلاً، اختر قالباً جاهزاً، أضف صورة، وانشره الآن أو جدوله. المعاينة بشكل تيليجرام تتحدث وأنت تكتب." />
      <Composer
        templates={s.templates}
        media={media.map((m) => m.url)}
        signature={s.general.signature}
        disclaimerText={s.general.disclaimer}
        destinations={s.destinations}
        defaultSchedule={toLocalInput(null, s.general.timezone)}
        timezone={s.general.timezone}
      />
    </>
  );
}
