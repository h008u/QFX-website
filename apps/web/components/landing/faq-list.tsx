"use client";

import { EditableText, useSiteContent } from "@/components/site-editor/editor";

/** الأسئلة الشائعة — من محتوى الموقع */
export function FaqList() {
  const { content, editing } = useSiteContent();
  return (
    <div>
      {content.faqs.map((f, i) => (
        <details key={i} className="group border-b border-border py-5" open={editing || undefined}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
            <EditableText list="faqs" index={i} field="q" />
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-lg transition-transform group-open:rotate-45">+</span>
          </summary>
          <EditableText as="p" list="faqs" index={i} field="a" multiline className="mt-3 block max-w-2xl text-[15px] leading-8 text-muted-foreground" />
        </details>
      ))}
    </div>
  );
}
