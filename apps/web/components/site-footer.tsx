import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <div className="container grid gap-8 py-10 md:grid-cols-3">
        <div>
          <p className="text-lg font-black">
            Q<span className="text-primary">FX</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            وكيل معرّف (Introducing Broker) يربط المتداولين العرب بشركات وساطة مرخّصة، مع توصيات وتحليلات ومجتمع تداول بالعربية.
          </p>
        </div>
        <div>
          <p className="mb-3 font-bold">روابط</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={siteConfig.telegramUrl} target="_blank" rel="noopener" className="hover:text-foreground">
                قناة تيليجرام
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-bold">تحذير المخاطر</p>
          <p className="text-xs leading-6 text-muted-foreground">
            تداول العملات الأجنبية والعقود مقابل الفروقات بالهامش ينطوي على مستوى عالٍ من المخاطر وقد لا يناسب جميع المستثمرين، وقد
            تخسر كامل رأس مالك. الأداء السابق لا يضمن النتائج المستقبلية. المحتوى المنشور تعليمي ولا يُعد نصيحة استثمارية. نحن وكيل
            معرّف ولسنا شركة وساطة، ولا نستلم أموال العملاء.
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {siteConfig.name}. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
