import Link from "next/link";
import { CookieSettingsButton } from "@/components/consent/banner";
import { PageTitle } from "@/components/page-title";
import { COOKIE_TABLE, LEGAL_DOCS, type LegalDoc } from "@/config/legal";
import { breadcrumbLd, JsonLd } from "@/lib/jsonld";
import { getSiteContent } from "@/lib/site-settings";

const OTHERS: [LegalDoc["slug"], string][] = [
  ["privacy", "الخصوصية"],
  ["terms", "الشروط"],
  ["cookies", "الكوكيز"],
  ["risk", "إفصاح المخاطر"],
];

export async function LegalPage({ slug }: { slug: LegalDoc["slug"] }) {
  const doc = LEGAL_DOCS[slug];
  const { texts } = await getSiteContent();
  const fill = (s: string) =>
    s.replace(/\{operator\}/g, texts["legal.operator"]).replace(/\{email\}/g, texts["legal.email"]).replace(/\{location\}/g, texts["legal.location"]);
  return (
    <div className="container py-8 md:py-12">
      <JsonLd data={breadcrumbLd([["الرئيسية", "/"], [doc.title, `/${slug}`]])} />
      <div className="mx-auto max-w-[760px]">
        <nav className="mb-6 flex flex-wrap gap-2">
          {OTHERS.map(([s, l]) => (
            <Link key={s} href={`/${s}`} className={s === slug ? "rounded-pill bg-foreground px-3 py-1 text-sm font-semibold text-background" : "rounded-pill bg-secondary px-3 py-1 text-sm"}>
              {l}
            </Link>
          ))}
        </nav>
        <PageTitle title={doc.title} text={fill(doc.intro)} />
        <p className="mt-3 text-xs text-muted-foreground">آخر تحديث: <span className="num">{texts["legal.updated"]}</span></p>
        <div className="article-body mt-8">
          {doc.sections.map((sec) => (
            <section key={sec.h}>
              <h2>{sec.h}</h2>
              {sec.p.length > 1 ? (
                <ul>
                  {sec.p.map((p) => (
                    <li key={p}>{fill(p)}</li>
                  ))}
                </ul>
              ) : (
                <p>{fill(sec.p[0])}</p>
              )}
            </section>
          ))}
          {slug === "cookies" && (
            <section>
              <h2>ما نستخدمه بالتفصيل</h2>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>النوع</th>
                      <th>الغرض</th>
                      <th>المدة</th>
                      <th>الفئة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COOKIE_TABLE.map((c) => (
                      <tr key={c.name}>
                        <td className="num whitespace-nowrap" style={{ textAlign: "right" }}>{c.name}</td>
                        <td>{c.kind}</td>
                        <td>{c.purpose}</td>
                        <td>{c.duration}</td>
                        <td>{c.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                <CookieSettingsButton className="font-semibold text-primary underline">فتح إعدادات الكوكيز</CookieSettingsButton>
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
