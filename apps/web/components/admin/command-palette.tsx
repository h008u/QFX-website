"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, QUICK_ACTIONS } from "./nav";

/** بحث سريع Ctrl+K: يوديك لأي صفحة أو إجراء */
export function CommandPalette({ open, onClose, isAdmin }: { open: boolean; onClose: () => void; isAdmin: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo(
    () => [
      ...QUICK_ACTIONS.map((a) => ({ ...a, hint: "إجراء", keywords: "" })),
      ...ADMIN_NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => ({ href: n.href, label: n.label, icon: n.icon, hint: n.group, keywords: n.keywords ?? "" })),
    ],
    [isAdmin],
  );
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? all.filter((r) => `${r.label} ${r.keywords} ${r.hint}`.toLowerCase().includes(t)) : all;
  }, [q, all]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);
  useEffect(() => setIndex(0), [q]);

  if (!open) return null;
  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal aria-label="بحث سريع">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && results[index]) go(results[index].href);
            }}
            placeholder="اكتب اسم صفحة أو إجراء..."
            className="h-12 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-1">
          {results.map((r, i) => (
            <li key={`${r.href}-${r.label}`}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(r.href)}
                className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-start text-sm", i === index && "bg-secondary")}
              >
                <r.icon className="h-4 w-4 text-muted-foreground" />
                {r.label}
                <span className="ms-auto text-[11px] text-muted-foreground">{r.hint}</span>
                {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            </li>
          ))}
          {!results.length && <li className="p-6 text-center text-sm text-muted-foreground">لا نتائج</li>}
        </ul>
      </div>
    </div>
  );
}
