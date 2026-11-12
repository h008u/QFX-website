import type { Metadata } from "next";
import { CommunityFeed } from "@/components/feed/community-feed";
import { PageTitle } from "@/components/page-title";
import { buttonVariants } from "@/components/ui/button";
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
    <div className="container space-y-8 py-8 md:py-12">
      <PageTitle title="الأفكار والأخبار" text="تحليلات يومية وتنبيهات المفكرة الاقتصادية — تصل هنا وفي قناة التيليجرام فور نشرها." />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <CommunityFeed initial={data} demo={demo} />
        <aside className="space-y-4">
          <div className="sticky top-20 rounded-2xl bg-[#0F0F0F] p-6 text-white">
            <h3 className="text-xl font-bold">انضم للقناة</h3>
            <p className="mt-2 text-sm leading-7 text-white/70">
              فعّل الإشعارات في قناة التيليجرام لتصلك التوصيات وتنبيهات الأخبار عالية التأثير قبل صدورها.
            </p>
            <a href={siteConfig.telegramUrl} target="_blank" rel="noopener" className={buttonVariants({ size: "pill", className: "mt-5 w-full" })}>
              فتح تيليجرام
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
