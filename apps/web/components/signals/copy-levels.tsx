"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** ينسخ مستويات التوصية (الدخول/الوقف/الأهداف) بلمسة — لمن ينفّذ الصفقة من تطبيق التداول على الجوال */
export function CopyLevelsButton({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // متصفحات قديمة أو صفحة غير آمنة: طريقة احتياطية
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    navigator.vibrate?.(15);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="نسخ المستويات"
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold transition-colors hover:bg-secondary", done && "border-success text-success", className)}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "تم النسخ" : "نسخ المستويات"}
    </button>
  );
}
