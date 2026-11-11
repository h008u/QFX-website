"use client";

import { POST_KIND_LABEL, type PostKind, type PostStatus } from "@qfx/shared";
import { ChevronDown, ExternalLink, RotateCw, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { publishPostAction, rejectPostAction } from "@/app/admin/_actions/posts";
import { Button } from "@/components/ui/button";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { TelegramPreview } from "../telegram-preview";
import { ActionMessage, StatusBadge, useAction } from "../ui";

export interface LogPost {
  id: string;
  kind: PostKind;
  status: PostStatus;
  title: string | null;
  body: string;
  format: "markup" | "html";
  source: string | null;
  source_url: string | null;
  score: number | null;
  reason: string | null;
  photo_url: string | null;
  categories: string[];
  results: { dest: string; chat_id: string; ok: boolean; error?: string; message_id?: number }[];
  views?: number | null;
  created_at: string;
  published_at: string | null;
  scheduled_at: string | null;
  createdLabel: string;
}

const plain = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

function Row({ p, canEdit, destLabels }: { p: LogPost; canEdit: boolean; destLabels: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const publish = useAction(publishPostAction);
  const reject = useAction(rejectPostAction);
  const busy = publish.pending || reject.pending;
  const canPublish = ["pending", "scheduled", "draft", "failed"].includes(p.status);
  const canForce = ["filtered", "duplicate", "rejected"].includes(p.status);
  const canResend = p.status === "partial" || (p.status === "failed" && p.results.length > 0);

  return (
    <li className="border-b border-border/60 last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-secondary/40" aria-expanded={open}>
        <StatusBadge status={p.status} />
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{POST_KIND_LABEL[p.kind]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{p.title || plain(p.body).slice(0, 120)}</span>
          {p.reason && <span className="block truncate text-xs text-muted-foreground">{p.reason}</span>}
        </span>
        {p.views ? <span className="num hidden shrink-0 text-[11px] text-muted-foreground md:inline">👁 {p.views}</span> : null}
        {p.score !== null && <span className="num hidden shrink-0 rounded bg-secondary px-1.5 text-[11px] text-muted-foreground md:inline">{p.score}</span>}
        <span className="num shrink-0 text-xs text-muted-foreground">{p.createdLabel}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-4 bg-background/40 px-4 pb-4 pt-1 lg:grid-cols-2">
          <TelegramPreview body={p.body} format={p.format} photo={p.photo_url} />
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">النوع</dt>
              <dd>{POST_KIND_LABEL[p.kind]}</dd>
              {p.source && (<><dt className="text-muted-foreground">المصدر</dt><dd>{p.source}</dd></>)}
              {p.score !== null && (<><dt className="text-muted-foreground">التقييم</dt><dd className="num">{p.score}/100</dd></>)}
              {p.categories.length > 0 && (<><dt className="text-muted-foreground">الأنواع</dt><dd>{p.categories.join("، ")}</dd></>)}
              {p.reason && (<><dt className="text-muted-foreground">السبب</dt><dd>{p.reason}</dd></>)}
            </dl>
            {p.results.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">أماكن النشر</p>
                <ul className="space-y-1">
                  {p.results.map((r) => (
                    <li key={r.dest} className="flex items-start gap-2 text-xs">
                      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", r.ok ? "bg-success" : "bg-destructive")} />
                      <span>
                        <b>{destLabels[r.dest] ?? r.chat_id}</b>
                        {r.ok ? <span className="text-muted-foreground"> — نُشر</span> : <span className="text-destructive"> — {r.error}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canEdit && (
              <div className="flex flex-wrap gap-2 pt-1">
                {canPublish && (
                  <Button size="sm" disabled={busy} onClick={() => publish.run(p.id, {})}>
                    <Send className="h-4 w-4" /> {p.status === "pending" ? "موافقة ونشر" : "نشر الآن"}
                  </Button>
                )}
                {canForce && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => publish.run(p.id, { force: true })}>
                    <Send className="h-4 w-4" /> انشره رغم ذلك
                  </Button>
                )}
                {canResend && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => publish.run(p.id, { onlyFailed: true })}>
                    <RotateCw className="h-4 w-4" /> أعد الإرسال للتي فشلت
                  </Button>
                )}
                {["pending", "scheduled", "draft", "failed"].includes(p.status) && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => reject.run(p.id)}>
                    <X className="h-4 w-4" /> تجاهل
                  </Button>
                )}
                {p.source_url && (
                  <a href={p.source_url} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-1 px-2 text-xs text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> الخبر الأصلي
                  </a>
                )}
              </div>
            )}
            <ActionMessage result={publish.result ?? reject.result} />
          </div>
        </div>
      )}
    </li>
  );
}

/** سجل مباشر: يتحدّث تلقائياً عبر Realtime عند أي تغيير في المنشورات */
export function PostLog({ posts, canEdit, destLabels, live }: { posts: LogPost[]; canEdit: boolean; destLabels: Record<string, string>; live: boolean }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const sb = getBrowserClient();
    if (!sb || !live) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const ch = sb
      .channel("admin:posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        clearTimeout(t);
        t = setTimeout(() => router.refresh(), 800);
      })
      .subscribe((s) => setConnected(s === "SUBSCRIBED"));
    return () => {
      clearTimeout(t);
      sb.removeChannel(ch);
    };
  }, [live, router]);

  return (
    <div className="rounded-lg border border-border bg-card">
      {live && (
        <p className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
          <span className={cn("h-2 w-2 rounded-full", connected ? "animate-pulse-dot bg-success" : "bg-muted-foreground")} />
          {connected ? "يتحدّث مباشرة" : "جارٍ الاتصال..."}
        </p>
      )}
      <ul>
        {posts.map((p) => (
          <Row key={p.id} p={p} canEdit={canEdit} destLabels={destLabels} />
        ))}
        {!posts.length && <li className="p-10 text-center text-sm text-muted-foreground">لا نتائج بهذه الفلاتر</li>}
      </ul>
    </div>
  );
}
