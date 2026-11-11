import { MediaLibrary } from "@/components/admin/media-library";
import { PageHeader } from "@/components/admin/ui";
import { listMedia } from "@/lib/admin/media";
import { canEdit, getAdminContext } from "@/lib/admin/session";

export const metadata = { title: "مكتبة الصور" };

export default async function MediaPage() {
  const ctx = (await getAdminContext())!;
  const files = await listMedia(ctx);
  return (
    <>
      <PageHeader title="مكتبة الصور" description="ارفع الشعارات والخلفيات مرة واحدة، ثم اخترها في «منشور جديد» أو لصور التحيات من الإعدادات. التخزين على Supabase Storage (1GB مجاناً)." />
      <MediaLibrary files={files} canEdit={canEdit(ctx.role)} demo={ctx.demo} />
    </>
  );
}
