"use client";

import { POST_KIND_LABEL, type PostKind, type PostStatus } from "@qfx/shared";
import { Check, ExternalLink, Save, X } from "lucide-react";
import { useState } from "react";
import { publishPostAction, rejectPostAction, updatePostBodyAction } from "@/app/admin/_actions/posts";
import { Button } from "@/components/ui/button";
import { TelegramPreview } from "./telegram-preview";
import { ActionMessage, StatusBadge, useAction } from "./ui";

export interface ReviewPost {
  id: string;
  kind: PostKind;
  status: PostStatus;
  body: string;
  format: "markup" | "html";
  source: string | null;
  source_url: string | null;
  score: number | null;
  reason: string | null;
  photo_url: string | null;
  createdLabel: string;
}

export function ReviewItem({ post, signature, disclaimer, canEdit }: { post: ReviewPost; signature: string; disclaimer: string; canEdit: boolean }) {
  const [body, setBody] = useState(post.body);
  const [done, setDone] = useState<string | null>(null);
  const save = useAction(updatePostBodyAction);
  const publish = useAction(publishPostAction);
  const reject = useAction(rejectPostAction);
  const busy = save.pending || publish.pending || reject.pending;
  const dirty = body !== post.body;
  const force = post.status !== "pending";

  if (done) return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{done}</div>;

  return (
    <article className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 text-xs">
        <StatusBadge status={post.status} />
        <span className="text-muted-foreground">{POST_KIND_LABEL[post.kind]}</span>
        {post.source && <span className="text-muted-foreground">• {post.source}</span>}
        {post.score !== null && (
          <span className="num flex items-center gap-1.5 rounded bg-secondary px-2 py-0.5">
            <span className="h-1.5 w-12 overflow-hidden rounded bg-background">
              <span className="block h-full bg-primary" style={{ width: `${post.score}%` }} />
            </span>
            {post.score}
          </span>
        )}
        {post.reason && <span className="text-muted-foreground">— {post.reason}</span>}
        <span className="num ms-auto text-muted-foreground">{post.createdLabel}</span>
      </header>
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!canEdit}
            rows={9}
            dir="auto"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {post.format === "html" && <p className="text-[11px] text-muted-foreground">منشور بصيغة HTML تيليجرام (b, i, a, code).</p>}
        </div>
        <TelegramPreview body={body} format={post.format} photo={post.photo_url} signature={signature} disclaimer={null} />
      </div>
      {canEdit && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              if (dirty) {
                const r = await save.run(post.id, body);
                if (!r.ok) return;
              }
              const r = await publish.run(post.id, { force });
              if (r.ok) setDone(`✅ ${r.message}`);
            }}
          >
            <Check className="h-4 w-4" /> {dirty ? "حفظ ونشر" : "نشر"}
          </Button>
          {dirty && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => save.run(post.id, body)}>
              <Save className="h-4 w-4" /> حفظ التعديل
            </Button>
          )}
          {post.status === "pending" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                const r = await reject.run(post.id);
                if (r.ok) setDone("تم التجاهل");
              }}
            >
              <X className="h-4 w-4" /> تجاهل
            </Button>
          )}
          {post.source_url && (
            <a href={post.source_url} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> الخبر الأصلي
            </a>
          )}
          <ActionMessage result={publish.result ?? save.result ?? reject.result} className="ms-auto" />
        </footer>
      )}
    </article>
  );
}
