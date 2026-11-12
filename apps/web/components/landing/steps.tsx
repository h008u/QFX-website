"use client";

import { BadgeCheck, Link2, Send, Wallet } from "lucide-react";
import { EditableText, useSiteContent } from "@/components/site-editor/editor";

const ICONS = [Link2, Wallet, BadgeCheck, Send];

/** خطوات الانضمام — النصوص من محتوى الموقع */
export function Steps() {
  const { content } = useSiteContent();
  return (
    <ol className="relative grid gap-6 md:grid-cols-4">
      {content.steps.map((step, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <li key={i} className="relative rounded-lg border border-border bg-card p-5">
            <span className="absolute -top-3 start-5 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">الخطوة {i + 1}</span>
            <Icon className="mt-2 h-8 w-8 text-primary" />
            <EditableText as="h3" list="steps" index={i} field="title" className="mt-4 block font-bold" />
            <EditableText as="p" list="steps" index={i} field="text" multiline className="mt-2 block text-sm leading-7 text-muted-foreground" />
          </li>
        );
      })}
    </ol>
  );
}
