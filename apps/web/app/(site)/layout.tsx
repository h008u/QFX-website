import { BottomNav } from "@/components/bottom-nav";
import { AnnouncementBar, SiteEditorProvider } from "@/components/site-editor/editor";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemePreviewBar } from "@/components/theme-preview-bar";
import { TickerTape } from "@/components/ticker-tape";
import { getSiteContent } from "@/lib/site-settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent();
  return (
    <SiteEditorProvider initial={content}>
      <div className="pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
        <AnnouncementBar />
        <TickerTape />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <BottomNav />
        <ThemePreviewBar />
      </div>
    </SiteEditorProvider>
  );
}
