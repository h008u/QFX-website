import Link from "next/link";
import { EditableText } from "@/components/site-editor/editor";
import { siteConfig } from "@/config/site";
import { Logo } from "./site-header";

const COLS = [
  { title: "المنصة", links: [["/markets", "الأسواق والشارت"], ["/signals", "التوصيات وسجل الأداء"], ["/feed", "الأفكار والأخبار"], ["/markets?s=XAUUSD", "الذهب XAUUSD"]] },
  { title: "الوكالة", links: [["/how-it-works", "كيف نعمل"], ["/#join", "افتح حسابك"], ["/how-it-works#faq", "الأسئلة الشائعة"], [siteConfig.telegramUrl, "قناة تيليجرام"]] },
  { title: "حسابك", links: [["/login", "تسجيل الدخول"], ["/account", "حسابي ورابط الإحالة"], ["/admin", "لوحة الإدارة"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="container grid grid-cols-2 gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <EditableText as="p" k="footer.about" multiline className="mt-4 block max-w-sm text-sm leading-7 text-muted-foreground" />
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
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
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col gap-3 py-6 text-xs leading-6 text-muted-foreground md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl">
            ⚠️ تداول العملات والعقود مقابل الفروقات بالهامش ينطوي على مخاطر عالية وقد لا يناسب جميع المستثمرين، وقد تخسر كامل رأس مالك. الأداء السابق لا يضمن النتائج المستقبلية. المحتوى تعليمي وليس نصيحة استثمارية. نحن وكيل معرّف ولسنا شركة وساطة، ولا نستلم أموال العملاء.
          </p>
          <p className="shrink-0">© {new Date().getFullYear()} {siteConfig.name}</p>
        </div>
      </div>
    </footer>
  );
}
