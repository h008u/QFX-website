import {
  CalendarSection, DestinationsSection, ExtrasSection, GeneralSection, GreetingsSection, HolidaysSection, NewsSection, TradingViewSection, WeeklySection,
} from "@/components/admin/settings/sections";
import { PageHeader } from "@/components/admin/ui";
import { listMedia } from "@/lib/admin/media";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";

export const metadata = { title: "الإعدادات" };

const NAV = [
  ["general", "عام"],
  ["destinations", "أماكن النشر"],
  ["news", "الأخبار والمصادر"],
  ["calendar", "الأجندة"],
  ["greetings", "التحيات"],
  ["weekly", "ملخص الأسبوع"],
  ["extras", "النظرة والنتائج والمشاهدات"],
  ["holidays", "العطل"],
  ["tradingview", "TradingView"],
] as const;

export default async function SettingsPage() {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const media = (await listMedia(ctx)).map((m) => m.url);
  const edit = canEdit(ctx.role);
  const pub = process.env.BOT_PUBLIC_URL?.replace(/\/$/, "");
  const tvSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
  const webhookUrl = pub ? `${pub}/webhooks/tradingview?secret=${tvSecret && ctx.role === "admin" ? tvSecret : "•••"}` : null;
  return (
    <>
      <PageHeader title="الإعدادات" description="كل ما يتحكم بالبوت: أين ينشر، ماذا ينشر، ومتى. التغييرات تُطبّق خلال دقيقة بدون إعادة تشغيل." />
      <nav className="sticky top-14 z-30 -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-border bg-background/90 px-4 py-2 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            {label}
          </a>
        ))}
      </nav>
      <div className="space-y-6">
        <GeneralSection initial={s.general} canEdit={edit} />
        <DestinationsSection initial={s.destinations} canEdit={edit} />
        <NewsSection initial={s.news} canEdit={edit} />
        <CalendarSection initial={s.calendar} canEdit={edit} />
        <GreetingsSection initial={s.greetings} media={media} canEdit={edit} />
        <WeeklySection initial={s.weekly} canEdit={edit} />
        <ExtrasSection outlook={s.outlook} results={s.event_results} views={s.views} canEdit={edit} />
        <HolidaysSection initial={s.holidays} canEdit={edit} />
        <TradingViewSection initial={s.tradingview} webhookUrl={webhookUrl} canEdit={edit} />
      </div>
    </>
  );
}
