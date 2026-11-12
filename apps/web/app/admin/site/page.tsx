import { SiteContentEditor } from "@/components/admin/site-content-editor";
import { PageHeader } from "@/components/admin/ui";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { getSiteContent } from "@/lib/site-settings";

export const metadata = { title: "محتوى الموقع" };

export default async function SiteContentPage() {
  const ctx = (await getAdminContext())!;
  const content = await getSiteContent();
  return (
    <>
      <PageHeader
        title="محتوى الموقع"
        description="رتّب أقسام الصفحة الرئيسية بالسحب، أظهرها أو أخفها، وعدّل كل النصوص والأسئلة الشائعة. أو افتح «التعديل المباشر» لتعدّل على الصفحة نفسها."
      />
      <SiteContentEditor initial={content} canEdit={canEdit(ctx.role)} />
    </>
  );
}
