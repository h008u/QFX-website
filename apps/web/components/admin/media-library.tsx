"use client";

import { Copy, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteMediaAction, logUploadAction } from "@/app/admin/_actions/media";
import { Button } from "@/components/ui/button";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ActionMessage, useAction } from "./ui";

export interface MediaFile {
  name: string;
  url: string;
  size: number | null;
}

const MAX_MB = 5;

export function MediaLibrary({ files, canEdit, demo }: { files: MediaFile[]; canEdit: boolean; demo: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const del = useAction(deleteMediaAction);

  async function upload(list: FileList | null) {
    const sb = getBrowserClient();
    if (!list?.length) return;
    if (!sb || demo) return setMsg({ ok: false, message: "الرفع يحتاج Supabase (غير متاح في وضع المعاينة)" });
    setBusy(true);
    const done: string[] = [];
    for (const f of Array.from(list)) {
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) {
        setMsg({ ok: false, message: `${f.name}: الصيغة غير مدعومة` });
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setMsg({ ok: false, message: `${f.name}: أكبر من ${MAX_MB}MB` });
        continue;
      }
      const ext = f.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await sb.storage.from("media").upload(name, f, { contentType: f.type, cacheControl: "31536000" });
      if (error) setMsg({ ok: false, message: `${f.name}: ${error.message}` });
      else done.push(name);
    }
    if (done.length) {
      await logUploadAction(done);
      setMsg({ ok: true, message: `تم رفع ${done.length} صورة` });
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div>
      {canEdit && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
          className="mb-6 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border bg-card p-8 text-center"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">اسحب الصور هنا أو</p>
          <Button disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "جارٍ الرفع..." : "اختر صوراً"}
          </Button>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => upload(e.target.files)} />
          <p className="text-[11px] text-muted-foreground">PNG / JPG / WebP / GIF — حتى {MAX_MB}MB للصورة</p>
          <ActionMessage result={msg} />
        </div>
      )}
      <ActionMessage result={del.result} className="mb-3" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {files.map((f) => (
          <figure key={f.name} className="group overflow-hidden rounded-lg border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
            <figcaption className="flex items-center gap-1 p-2">
              <span className="num min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{f.size ? `${Math.round(f.size / 1024)}KB` : f.name}</span>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(new URL(f.url, location.origin).toString()).catch(() => undefined);
                  setCopied(f.name);
                  setTimeout(() => setCopied(null), 1200);
                }}
                className={cn("rounded p-1 hover:bg-secondary", copied === f.name && "text-success")}
                aria-label="نسخ الرابط"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {canEdit && !demo && (
                <button onClick={() => confirm("حذف الصورة؟") && del.run(f.name)} className="rounded p-1 hover:bg-secondary hover:text-destructive" aria-label="حذف">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {!files.length && <p className="p-10 text-center text-sm text-muted-foreground">المكتبة فارغة</p>}
    </div>
  );
}
