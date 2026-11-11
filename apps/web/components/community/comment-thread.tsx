"use client";

import { MessageCircle, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/use-user";
import { cn, timeAgo } from "@/lib/utils";

interface Comment {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** نقاش تحت خبر أو توصية — يُحمَّل عند الفتح ويتحدّث مباشرة عبر Realtime */
export function CommentThread({ target, targetId }: { target: "news" | "signal"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const user = useUser();
  const column = target === "news" ? "news_id" : "signal_id";
  const listRef = useRef<HTMLUListElement>(null);
  const available = Boolean(getBrowserClient()) && UUID.test(targetId);

  useEffect(() => {
    const sb = getBrowserClient();
    if (!open || !sb || !available) return;
    let cancelled = false;
    sb.from("comments")
      .select("id, author_id, author_name, body, created_at")
      .eq(column, targetId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!cancelled) setComments((data as Comment[]) ?? []);
      });

    const channel = sb
      .channel(`comments:${column}:${targetId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `${column}=eq.${targetId}` }, (p) => {
        setComments((prev) => {
          const list = prev ?? [];
          if (p.eventType === "DELETE") return list.filter((c) => c.id !== (p.old as Comment).id);
          const row = p.new as Comment;
          return list.some((c) => c.id === row.id) ? list.map((c) => (c.id === row.id ? row : c)) : [...list, row];
        });
      })
      .subscribe();
    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [open, available, column, targetId]);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [comments?.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getBrowserClient();
    const text = body.trim();
    if (!sb || !user || !text) return;
    setSending(true);
    setError("");
    const { data, error } = await sb
      .from("comments")
      .insert({ author_id: user.id, [column]: targetId, body: text.slice(0, 2000) })
      .select("id, author_id, author_name, body, created_at")
      .single();
    setSending(false);
    if (error) {
      setError(/rate_limited/.test(error.message) ? "تعليقات كثيرة، انتظر دقيقة" : "تعذّر إرسال التعليق");
      return;
    }
    setBody("");
    setComments((prev) => (prev?.some((c) => c.id === data.id) ? prev : [...(prev ?? []), data as Comment]));
  }

  async function remove(id: string) {
    const sb = getBrowserClient();
    if (!sb) return;
    const { error } = await sb.from("comments").delete().eq("id", id);
    if (!error) setComments((prev) => prev?.filter((c) => c.id !== id) ?? null);
  }

  return (
    <div className="mt-3 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        <MessageCircle className="h-4 w-4" />
        {open ? "إخفاء النقاش" : comments?.length ? `النقاش (${comments.length})` : "النقاش"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {!available ? (
            <p className="text-xs text-muted-foreground">النقاش متاح بعد ربط قاعدة البيانات.</p>
          ) : comments === null ? (
            <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>
          ) : (
            <ul ref={listRef} className="max-h-72 space-y-2 overflow-y-auto">
              {comments.map((c) => (
                <li key={c.id} className="rounded-md bg-secondary/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{c.author_name}</span>
                    <span className="flex items-center gap-2">
                      {timeAgo(c.created_at)}
                      {user?.id === c.author_id && (
                        <button onClick={() => remove(c.id)} className="hover:text-destructive">
                          حذف
                        </button>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6">{c.body}</p>
                </li>
              ))}
              {!comments.length && <li className="text-xs text-muted-foreground">كن أول من يعلّق.</li>}
            </ul>
          )}

          {available &&
            (user ? (
              <form onSubmit={submit} className="flex items-end gap-2">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="اكتب تعليقاً..."
                  className="min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  aria-label="إرسال"
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity",
                    (sending || !body.trim()) && "opacity-50",
                  )}
                >
                  <SendHorizontal className="h-4 w-4 rotate-180" />
                </button>
              </form>
            ) : user === null ? (
              <p className="text-xs text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">
                  سجّل دخولك
                </Link>{" "}
                للمشاركة في النقاش.
              </p>
            ) : null)}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
