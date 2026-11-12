import { BottomNav } from "@/components/bottom-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
