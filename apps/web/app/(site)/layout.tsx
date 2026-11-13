import { Analytics } from "@/components/analytics";
import { BottomNav } from "@/components/bottom-nav";
import { ConsentBanner } from "@/components/consent/banner";
import { ConsentProvider } from "@/components/consent/provider";
import { AnnouncementBar, SiteEditorProvider } from "@/components/site-editor/editor";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemePreviewBar } from "@/components/theme-preview-bar";
import { TickerTape } from "@/components/ticker-tape";
import { JsonLd, organizationLd, websiteLd } from "@/lib/jsonld";
import { getSiteContent } from "@/lib/site-settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent();
  return (
    <ConsentProvider>
    <SiteEditorProvider initial={content}>
      <div className="pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <AnnouncementBar />
        <TickerTape />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <BottomNav />
        <ThemePreviewBar />
        <ConsentBanner />
        <Analytics />
      </div>
    </SiteEditorProvider>
    </ConsentProvider>
  );
}
