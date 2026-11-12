import sanitizeHtml from "sanitize-html";

/**
 * ينظّف HTML المقالات قبل الحفظ وقبل العرض بـ dangerouslySetInnerHTML (منقول ومكيّف من fx-partners).
 * المحرر ينتج HTML؛ لو سُرق حساب محرر أو لُصق محتوى خبيث فهذا الحد يمنع وصول سكربت لمتصفح الزوار.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "blockquote", "code", "pre", "hr", "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td", "span"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      "*": ["dir"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["https", "http"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tag, attribs) => {
        const href = attribs.href ?? "";
        const external = /^https?:\/\//i.test(href);
        return {
          tagName: "a",
          attribs: { href, ...(external ? { target: "_blank", rel: "noopener nofollow ugc" } : {}) },
        };
      },
      img: (tag, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: "lazy" } }),
    },
  });
}

/** نص خام من HTML (للمقتطف والوصف وحساب مدة القراءة) */
export function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}

export function readingMinutes(html: string): number {
  const words = htmlToText(html).split(" ").filter(Boolean).length;
  return Math.min(120, Math.max(1, Math.round(words / 200)));
}

/** معرّف رابط يدعم العربية: حروف وأرقام وشرطات فقط */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "") // التشكيل والتطويل
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
