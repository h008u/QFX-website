"use client";

import { LineChart, Percent, ShieldCheck, Sparkles, Users } from "lucide-react";
import { EditableText, useSiteContent } from "@/components/site-editor/editor";

const ICONS = [ShieldCheck, Percent, LineChart, Users, Sparkles];

/** بطاقات «لماذا QFX» — النصوص من محتوى الموقع */
export function WhyGrid() {
  const { content } = useSiteContent();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {content.why.map((w, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <div key={i} className="rounded-2xl bg-surface p-6">
            <Icon className="h-7 w-7 text-primary" />
            <EditableText as="p" list="why" index={i} field="title" className="mt-5 block text-lg font-bold" />
            <EditableText as="p" list="why" index={i} field="text" multiline className="mt-2 block text-[15px] leading-7 text-muted-foreground" />
          </div>
        );
      })}
    </div>
  );
}
