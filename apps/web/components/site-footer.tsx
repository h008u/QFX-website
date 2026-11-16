import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/consent/banner";
import { EditableText } from "@/components/site-editor/editor";
import { siteConfig } from "@/config/site";
import { Logo } from "./site-header";

const COLS = [
  { title: "المنصة", links: [["/markets", "الأسواق والشارت"], ["/signals", "التوصيات الحية"], ["/performance", "سجل الأداء"], ["/feed", "الأفكار والأخبار"], ["/blog", "المقالات"]] },
  { title: "الوكالة", links: [["/how-it-works", "كيف نعمل"], ["/#join", "افتح حسابك"], ["/how-it-works#faq", "الأسئلة الشائعة"], [siteConfig.telegramUrl, "قناة تيليجرام"]] },
  { title: "حسابك", links: [["/login", "تسجيل الدخول"], ["/account", "حسابي ورابط الإحالة"], ["/admin", "لوحة الإدارة"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border md:mt-24">
      <div className="container grid grid-cols-1 gap-6 py-8 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-10 md:py-14">
        <div>
          <Logo />
          <EditableText as="p" k="footer.about" multiline className="mt-4 block max-w-sm text-sm leading-7 text-muted-foreground" />
        </div>
        {/* الكمبيوتر: أعمدة ظاهرة */}
        {COLS.map((c) => (
          <div key={c.title} className="hidden md:block">
            <p className="mb-4 text-[15px] font-bold">{c.title}</p>
            <ul className="space-y-3 text-[15px]">
              {c.links.map(([href, label]) => (
                <li key={label}>
                  <Link href={href} className="text-foreground/80 transition-colors hover:text-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {/* الجوال: أقسام مطوية تُفتح باللمس (الشريط السفلي يغني عن عرضها كاملة) */}
        <div className="divide-y divide-border border-y border-border md:hidden">
          {COLS.map((c) => (
            <details key={c.title} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
                {c.title}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <ul className="space-y-3 pb-4 text-[15px]">
                {c.links.map(([href, label]) => (
                  <li key={label}>
                    <Link href={href} className="text-foreground/80 hover:text-primary">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col gap-3 py-6 text-xs leading-6 text-muted-foreground md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl">
            ⚠️ تداول العملات والعقود مقابل الفروقات بالهامش ينطوي على مخاطر عالية وقد لا يناسب جميع المستثمرين، وقد تخسر كامل رأس مالك. الأداء السابق لا يضمن النتائج المستقبلية. المحتوى تعليمي وليس نصيحة استثمارية. نحن وكيل معرّف ولسنا شركة وساطة، ولا نستلم أموال العملاء.
          </p>
          <div className="flex shrink-0 flex-col gap-2 md:items-end">
            <nav className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/privacy" className="hover:text-foreground">الخصوصية</Link>
              <Link href="/terms" className="hover:text-foreground">الشروط</Link>
              <Link href="/cookies" className="hover:text-foreground">الكوكيز</Link>
              <Link href="/risk" className="hover:text-foreground">إفصاح المخاطر</Link>
              <CookieSettingsButton className="hover:text-foreground" />
            </nav>
            <p>© {new Date().getFullYear()} {siteConfig.name}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
