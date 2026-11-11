"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  ok: boolean;
  message: string;
}

export const TOAST_EVENT = "qfx-toast";

/** يعرض نتيجة أي إجراء أسفل الشاشة — حتى لو اختفى العنصر الذي ضغطت عليه بعد التحديث */
export function emitToast(ok: boolean, message: string) {
  if (typeof window !== "undefined" && message) window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { ok, message } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const { ok, message } = (e as CustomEvent<{ ok: boolean; message: string }>).detail;
      const id = ++n;
      setToasts((t) => [...t.slice(-3), { id, ok, message }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
    };
    window.addEventListener(TOAST_EVENT, on);
    return () => window.removeEventListener(TOAST_EVENT, on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex max-w-md animate-fade-in items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg",
            t.ok ? "border-success/40" : "border-destructive/40",
          )}
        >
          {t.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
