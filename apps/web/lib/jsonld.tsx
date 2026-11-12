import { SITE, sameAs, siteUrl } from "./seo";

/**
 * يسلسل JSON-LD لتضمينه بأمان داخل <script type="application/ld+json">.
 * JSON.stringify لا يهرّب < و > و & — وقيمة فيها "</script>" (عنوان مقال أو تعليق) كانت ستكسر الوسم وتحقن شيفرة.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function organizationLd() {
  const links = sameAs();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl()}/#org`,
    name: SITE.name,
    alternateName: SITE.alternateName,
    url: siteUrl(),
    logo: `${siteUrl()}/icon.svg`,
    description: SITE.description,
    areaServed: SITE.areaServed,
    ...(links.length ? { sameAs: links } : {}),
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl()}/#website`,
    name: SITE.name,
    url: siteUrl(),
    inLanguage: "ar",
    publisher: { "@id": `${siteUrl()}/#org` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl()}/markets?s={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${siteUrl()}${path}` })),
  };
}

export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function articleLd(a: { title: string; description: string; path: string; image?: string | null; published?: string | null; modified?: string | null; author?: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    mainEntityOfPage: `${siteUrl()}${a.path}`,
    ...(a.image ? { image: [a.image] } : {}),
    ...(a.published ? { datePublished: a.published } : {}),
    ...(a.modified ? { dateModified: a.modified } : {}),
    author: { "@type": a.author ? "Person" : "Organization", name: a.author || SITE.name },
    publisher: { "@id": `${siteUrl()}/#org` },
    inLanguage: "ar",
  };
}

/** عنصر جاهز للصفحات */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />;
}
