"use client";

import { POST_KIND_LABEL, POST_STATUS_LABEL, type PostKind, type PostStatus } from "@qfx/shared";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

export interface ActionResult {
  ok: boolean;
  message: string;
}

const STATUS_TONE: Record<PostStatus, string> = {
  published: "bg-success/15 text-success",
  partial: "bg-gold/15 text-gold",
  pending: "bg-primary/15 text-primary",
  scheduled: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  publishing: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  failed: "bg-destructive/15 text-destructive",
  rejected: "bg-muted text-muted-foreground",
  filtered: "bg-muted text-muted-foreground",
  duplicate: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE[status])}>{POST_STATUS_LABEL[status]}</span>;
}

export function KindBadge({ kind }: { kind: PostKind }) {
  return <span className="inline-flex whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{POST_KIND_LABEL[kind]}</span>;
}

/** يشغّل Server Action ويعرض النتيجة */
export function useAction<A extends unknown[]>(fn: (...args: A) => Promise<ActionResult>) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (...args: A) =>
    new Promise<ActionResult>((resolve) =>
      start(async () => {
        try {
          const r = await fn(...args);
          setResult(r);
          resolve(r);
        } catch (e) {
          const r = { ok: false, message: e instanceof Error ? e.message : "حدث خطأ" };
          setResult(r);
          resolve(r);
        }
      }),
    );
  return { pending, result, run, clear: () => setResult(null) };
}

export function ActionMessage({ result, className }: { result: ActionResult | null; className?: string }) {
  if (!result?.message) return null;
  return <p className={cn("text-sm", result.ok ? "text-success" : "text-destructive", className)}>{result.message}</p>;
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", disabled && "cursor-not-allowed opacity-50")}>
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-secondary")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", checked ? "end-0.5" : "start-0.5")} />
      </button>
    </label>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ id, title, description, children, actions }: { id?: string; title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-bold">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** قائمة نصوص (كل سطر عنصر) */
export function ListInput({ value, onChange, placeholder, rows = 4 }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; rows?: number }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <textarea
      value={text}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean));
      }}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}
