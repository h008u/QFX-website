"use client";

import { Check, Link2, Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** مشاركة المقال: تيليجرام، واتساب، X، ونسخ الرابط */
export function ShareLinks({ url, title, className }: { url: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const btn = "grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-bold hover:bg-input/60";
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <a className={btn} href={`https://t.me/share/url?url=${u}&text=${t}`} target="_blank" rel="noopener" aria-label="مشاركة على تيليجرام"><Send className="h-3.5 w-3.5" /></a>
      <a className={btn} href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener" aria-label="مشاركة على واتساب">WA</a>
      <a className={btn} href={`https://x.com/intent/post?url=${u}&text=${t}`} target="_blank" rel="noopener" aria-label="مشاركة على X">X</a>
      <button
        className={btn}
        aria-label="نسخ الرابط"
        onClick={() => {
          navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-up" /> : <Link2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
