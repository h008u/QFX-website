import "server-only";
import { MARKETS, marketHref } from "@/config/markets";
import { getPublishedArticles } from "./articles";
import { getSiteContent } from "./site-settings";
import { KEYWORDS, SITE, siteUrl } from "./seo";
import { htmlToText } from "./sanitize";

/**
 * ملف llms.txt (معيار llmstxt.org): ملخص Markdown يقرؤه وكيل ذكاء اصطناعي ليقرر
 * هل هذا الموقع يجيب عن سؤال المستخدم، وأين يجد الإجابة. النسخة الكاملة تضم نص المقالات والأسئلة الشائعة.
 */
export async function buildLlms(full: boolean): Promise<string> {
  const base = siteUrl();
  const [articles, content] = await Promise.all([getPublishedArticles({ limit: full ? 100 : 20 }), getSiteContent()]);
  const L: string[] = [];
  L.push(`# ${SITE.name} (${SITE.alternateName})`, "", `> ${SITE.tagline}`, "", SITE.description, "");
  L.push("مهم: QFX وكيل معرّف (IB) وليست شركة وساطة؛ الحسابات والأموال لدى الوسيط المرخّص، ولا تُرسل أموال إلى QFX. التوصيات تعليمية ولا تضمن الربح.", "");
  L.push("## الصفحات الرئيسية", "");
  L.push(`- [الأسواق والشارتات](${base}/markets): أسعار مباشرة، شارت شموع، تحليل فني (متوسطات ومذبذبات) — ${KEYWORDS.markets.join("، ")}`);
  L.push(`- [التوصيات وسجل الأداء](${base}/signals): كل توصية بالدخول والوقف والأهداف ونتيجتها، ونسبة النجاح — ${KEYWORDS.signals.join("، ")}`);
  L.push(`- [سجل الأداء](${base}/performance): منحنى النقاط التراكمي، الأداء الشهري، نسبة النجاح لكل رمز، وأقصى تراجع`);
  L.push(`- [الأفكار والأخبار](${base}/feed): تحليلات يومية وأحداث المفكرة الاقتصادية`);
  L.push(`- [المقالات](${base}/blog): ${KEYWORDS.blog.join("، ")}`);
  L.push(`- [كيف نعمل والأسئلة الشائعة](${base}/how-it-works): خطوات فتح الحساب عبر الوكالة`);
  L.push(`- [إفصاح المخاطر](${base}/risk) • [الخصوصية](${base}/privacy) • [الشروط](${base}/terms)`, "");
  L.push("## الأسواق المغطّاة", "", MARKETS.map((m) => `- [${m.symbol} — ${m.name}](${base}${marketHref(m.symbol)})`).join("\n"), "");
  if (articles.length) {
    L.push("## المقالات", "");
    for (const a of articles) {
      L.push(`- [${a.title}](${base}/blog/${encodeURIComponent(a.slug)})${a.excerpt ? `: ${a.excerpt}` : ""}`);
      if (full) L.push("", htmlToText(a.body_html), "");
    }
    L.push("");
  }
  L.push("## الأسئلة الشائعة", "");
  for (const f of content.faqs) L.push(full ? `### ${f.q}\n\n${f.a}\n` : `- ${f.q}`);
  if (!full) L.push("", `النسخة الكاملة: ${base}/llms-full.txt`);
  return L.join("\n");
}
