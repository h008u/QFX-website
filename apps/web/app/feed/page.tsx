import type { Metadata } from "next";
import { CommunityFeed } from "@/components/feed/community-feed";
import { SectionHeading } from "@/components/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { getNews } from "@/lib/data";

export const metadata: Metadata = {
  title: "المجتمع والأخبار",
  description: "التحليلات الفنية اليومية وأخبار المفكرة الاقتصادية مقسّمة حسب الأصول: عملات، ذهب، نفط.",
};

export const revalidate = 30;

export default async function FeedPage() {
  const { data, demo } = await getNews(100);
  return (
    <div className="container py-16">
      <SectionHeading
        eyebrow="مباشر"
        title="المجتمع والأخبار"
        text="تحليلات يومية وتنبيهات المفكرة الاقتصادية — تصل هنا وفي قناة التيليجرام فور نشرها."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <CommunityFeed initial={data} demo={demo} />
        <aside className="space-y-4">
          <Card className="sticky top-20 p-5">
            <h3 className="font-bold">انضم للقناة</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              فعّل الإشعارات في قناة التيليجرام لتصلك التوصيات وتنبيهات الأخبار عالية التأثير قبل صدورها.
            </p>
            <a href={siteConfig.telegramUrl} target="_blank" rel="noopener" className={buttonVariants({ className: "mt-4 w-full" })}>
              فتح تيليجرام
            </a>
          </Card>
        </aside>
      </div>
    </div>
  );
}
