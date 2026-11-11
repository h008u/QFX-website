// تنسيق المنشورات: **عريض** __مائل__ [نص](رابط) ← HTML تيليجرام، والقوالب بخانات {اسم}
import { escapeHtml } from "./format";

/** يحوّل التنسيق البسيط إلى HTML آمن لتيليجرام */
export function renderMarkup(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => `<a href="${url.replace(/"/g, "&quot;")}">${label}</a>`);
  out = out.replace(/\*\*([^*\n][^*]*?)\*\*/g, "<b>$1</b>");
  out = out.replace(/__([^_\n][^_]*?)__/g, "<i>$1</i>");
  out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  return out;
}

/** نص عادي بدون وسوم (للمعاينة المختصرة والبحث) */
export function stripMarkup(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .trim();
}

export interface PostTemplate {
  id: string;
  name: string;
  body: string;
}

export const DEFAULT_POST_TEMPLATES: PostTemplate[] = [
  { id: "buy", name: "🟢 صفقة شراء", body: "🟢 **صفقة شراء — {الرمز}**\n\n📍 الدخول: {الدخول}\n🛑 وقف الخسارة: {الوقف}\n🎯 الهدف الأول: {الهدف 1}\n🎯 الهدف الثاني: {الهدف 2}\n🎯 الهدف الثالث: {الهدف 3}\n\n{ملاحظة}" },
  { id: "sell", name: "🔴 صفقة بيع", body: "🔴 **صفقة بيع — {الرمز}**\n\n📍 الدخول: {الدخول}\n🛑 وقف الخسارة: {الوقف}\n🎯 الهدف الأول: {الهدف 1}\n🎯 الهدف الثاني: {الهدف 2}\n🎯 الهدف الثالث: {الهدف 3}\n\n{ملاحظة}" },
  { id: "tp", name: "✅ هدف تحقق", body: "✅ **تحقق الهدف {رقم الهدف} — {الرمز}**\n\n💰 الربح: {النقاط} نقطة\n\n{ملاحظة}\n\nمبروك لكل من دخل معنا 🎉" },
  { id: "sl", name: "🛑 ضرب الوقف", body: "🛑 **ضرب وقف الخسارة — {الرمز}**\n\nالخسارة: {النقاط} نقطة\n\nالخسارة جزء من التداول والالتزام بالوقف يحمي رأس المال 💪" },
  { id: "update", name: "🔄 تحديث صفقة", body: "🔄 **تحديث صفقة — {الرمز}**\n\n{التحديث}\n\n📌 الوقف الجديد: {الوقف الجديد}" },
  { id: "urgent", name: "🚨 خبر عاجل", body: "🚨 **عاجل:** {الخبر}\n\n{التأثير المتوقع}" },
  { id: "analysis", name: "📊 تحليل فني", body: "📊 **تحليل {الرمز} — {الفريم}**\n\n{التحليل}\n\n🔺 مقاومة: {المقاومة}\n🔻 دعم: {الدعم}" },
];

/** الخانات الموجودة في قالب بالترتيب */
export function templateFields(body: string): string[] {
  return [...new Set([...body.matchAll(/\{([^{}\n]{1,30})\}/g)].map((m) => m[1]))];
}

/** تعبئة القالب: السطر الذي كل خاناته فارغة يُحذف */
export function fillTemplate(body: string, values: Record<string, string> = {}): string {
  return String(body)
    .split("\n")
    .filter((line) => {
      const keys = [...line.matchAll(/\{([^{}\n]{1,30})\}/g)].map((m) => m[1]);
      return !keys.length || keys.some((k) => String(values[k] ?? "").trim());
    })
    .join("\n")
    .replace(/\{([^{}\n]{1,30})\}/g, (_, k) => String(values[k] ?? "").trim())
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * ينظّف HTML ليبقى فقط ما يدعمه تيليجرام (b/strong/i/em/u/s/code/pre/blockquote و a بروابط http/https).
 * كل ما عداه يُعرض كنص. يُستخدم في معاينة اللوحة وقبل حفظ منشورات html المعدّلة يدوياً.
 */
export function sanitizeTelegramHtml(html: string): string {
  const escaped = String(html).replace(/&(?!(?:amp|lt|gt|quot|#39);)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/&lt;(\/?)(b|strong|i|em|u|s|code|pre|blockquote)&gt;/g, "<$1$2>")
    .replace(/&lt;a href="(https?:\/\/[^"<>\s]+)"&gt;/g, '<a href="$1">')
    .replace(/&lt;\/a&gt;/g, "</a>");
}
