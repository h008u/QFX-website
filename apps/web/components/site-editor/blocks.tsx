"use client";

import { ArrowLeft, Award, Bell, BookOpen, Clock, Gift, LineChart, MessageCircle, ShieldCheck, Target, TrendingUp, Users, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { BlockIcon, BlockTone, SiteBlock } from "@/config/site-content";
import { cn } from "@/lib/utils";
import { EditableText, useSiteContent } from "./editor";

export const ICONS: Record<BlockIcon, LucideIcon> = {
  shield: ShieldCheck, chart: LineChart, zap: Zap, users: Users, gift: Gift, book: BookOpen, target: Target, clock: Clock, award: Award, chat: MessageCircle, trend: TrendingUp, bell: Bell,
};

const TONE: Record<BlockTone, string> = {
  default: "",
  surface: "bg-surface",
  panel: "glass-card bg-panel text-panel-foreground",
  primary: "btn-primary bg-primary text-primary-foreground",
};
const MUTED: Record<BlockTone, string> = {
  default: "text-muted-foreground",
  surface: "text-muted-foreground",
  panel: "text-panel-muted",
  primary: "text-primary-foreground/85",
};

/** رابط يصبح نصاً عادياً في وضع التحرير (حتى لا تنقلك النقرة أثناء الكتابة) */
function MaybeLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const { editing } = useSiteContent();
  if (!href || editing) return <span className={className}>{children}</span>;
  return /^https?:\/\//.test(href) ? (
    <a href={href} target="_blank" rel="noopener" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** عرض كتلة مخصصة — كل نصوصها قابلة للتعديل بالنقر في وضع التحرير */
export function BlockView({ block: b, index: i }: { block: SiteBlock; index: number }) {
  const { editing } = useSiteContent();
  const T = (field: string, props: Omit<React.ComponentProps<typeof EditableText>, "list" | "index" | "field"> = {}) => (
    <EditableText list="blocks" index={i} field={field} {...props} />
  );
  const pad = b.tone === "default" ? "" : "rounded-2xl p-6 md:p-10";

  if (b.kind === "banner")
    return (
      <section className="container pt-10">
        <MaybeLink href={b.href} className={cn("group flex items-center justify-between gap-4 rounded-xl px-5 py-4 text-[15px] font-semibold md:px-8", TONE[b.tone === "default" ? "primary" : b.tone])}>
          {T("text")}
          {b.href && <ArrowLeft className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1" />}
        </MaybeLink>
      </section>
    );

  if (b.kind === "cta")
    return (
      <section className="container pt-16 md:pt-24">
        <div className={cn("flex flex-col items-start justify-between gap-6 md:flex-row md:items-center", pad || "border-y border-border py-10", TONE[b.tone])}>
          <div className="max-w-2xl">
            {T("title", { as: "h2", className: "block text-[26px] font-bold leading-tight md:text-[34px]" })}
            {T("text", { as: "p", multiline: true, className: cn("mt-3 block text-[15px] leading-7 md:text-base", MUTED[b.tone]) })}
          </div>
          {(b.button || b.href) && (
            <MaybeLink href={b.href} className={cn(buttonVariants({ size: "pill", variant: b.tone === "primary" ? "gold" : "default" }), "shrink-0")}>
              {T("button")}
            </MaybeLink>
          )}
        </div>
      </section>
    );

  if (b.kind === "cards")
    return (
      <section className="container pt-16 md:pt-24">
        <div className={cn(pad, TONE[b.tone])}>
          {T("title", { as: "h2", className: "mb-2 block text-[28px] font-bold md:text-[34px]" })}
          {(b.text || editing) && T("text", { as: "p", multiline: true, className: cn("mb-8 block max-w-2xl leading-7", MUTED[b.tone]) })}
          <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", b.items.length >= 3 && "lg:grid-cols-3", b.items.length === 4 && "lg:grid-cols-4")}>
            {b.items.map((it, k) => {
              const Icon = ICONS[it.icon] ?? Zap;
              return (
                <MaybeLink key={k} href={it.href} className={cn("group block rounded-2xl p-6 transition-colors", b.tone === "default" ? "bg-surface hover:bg-secondary" : "bg-background/10 ring-1 ring-current/10")}>
                  <Icon className={cn("h-7 w-7", b.tone === "default" || b.tone === "surface" ? "text-primary" : "")} />
                  {T(`items.${k}.title`, { as: "p", className: "mt-5 block text-lg font-bold" })}
                  {T(`items.${k}.text`, { as: "p", multiline: true, className: cn("mt-2 block text-[15px] leading-7", MUTED[b.tone]) })}
                </MaybeLink>
              );
            })}
          </div>
        </div>
      </section>
    );

  // text
  return (
    <section className="container pt-16 md:pt-24">
      <div className={cn(pad, TONE[b.tone])}>
        {T("title", { as: "h2", className: "block text-[28px] font-bold md:text-[34px]" })}
        {T("text", { as: "p", multiline: true, className: cn("mt-4 block max-w-3xl whitespace-pre-line text-[17px] leading-8", MUTED[b.tone]) })}
      </div>
    </section>
  );
}
