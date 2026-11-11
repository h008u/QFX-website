"use client";

import { renderMarkup, sanitizeTelegramHtml } from "@qfx/shared";
import { cn } from "@/lib/utils";

/**
 * معاينة بشكل رسالة تيليجرام. HTML الناتج آمن: renderMarkup يهرّب كل النص ولا يولّد إلا b/i/code/a(http)،
 * ومنشورات html تمر على sanitizeTelegramHtml (قائمة بيضاء لوسوم تيليجرام).
 */
export function TelegramPreview({
  body,
  format = "markup",
  disclaimer,
  signature,
  photo,
  className,
}: {
  body: string;
  format?: "markup" | "html";
  disclaimer?: string | null;
  signature?: string | null;
  photo?: string | null;
  className?: string;
}) {
  const parts = [format === "html" ? sanitizeTelegramHtml(body) : renderMarkup(body)];
  if (disclaimer?.trim()) parts.push(`<i>${renderMarkup(disclaimer.trim())}</i>`);
  if (signature?.trim()) parts.push(renderMarkup(signature.trim()));
  const html = parts.filter(Boolean).join("\n\n");
  return (
    <div className={cn("rounded-lg bg-[#dfe7ee] p-4 dark:bg-[#0e1621]", className)}>
      <div className="max-w-md overflow-hidden rounded-2xl rounded-ss-sm bg-white text-[14px] leading-6 text-[#000] shadow dark:bg-[#182533] dark:text-[#e9edef]">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="max-h-64 w-full object-cover" />
        )}
        <div
          className="whitespace-pre-wrap break-words px-3 py-2 [&_a]:text-[#2481cc] dark:[&_a]:text-[#6ab3f3] [&_a]:underline [&_code]:rounded [&_code]:bg-black/30 [&_code]:px-1"
          dir="auto"
          dangerouslySetInnerHTML={{ __html: html || "<span style='opacity:.5'>اكتب نص المنشور...</span>" }}
        />
        <div className="num px-3 pb-1.5 text-end text-[11px] text-[#8a9aa9] dark:text-[#6c7883]">12:00</div>
      </div>
    </div>
  );
}
