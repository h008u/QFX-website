"use client";

import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cancelScheduledAction, reschedulePostAction } from "@/app/admin/_actions/posts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ActionMessage, useAction } from "./ui";

export interface CalItem {
  id: string;
  date: string; // YYYY-MM-DD محلي
  time: string; // HH:MM
  label: string;
  type: "scheduled" | "published" | "recurring" | "event";
  local?: string; // datetime-local للمجدول
}

const TONE: Record<CalItem["type"], string> = {
  scheduled: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  published: "bg-secondary text-muted-foreground border-transparent",
  recurring: "bg-primary/10 text-primary border-primary/20",
  event: "bg-destructive/10 text-destructive border-destructive/20",
};
const WD = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export function ContentCalendar({
  month,
  days,
  items,
  today,
  prev,
  next,
  canEdit,
}: {
  month: string;
  days: { date: string; inMonth: boolean }[];
  items: CalItem[];
  today: string;
  prev: string;
  next: string;
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState<CalItem | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const move = useAction(reschedulePostAction);
  const cancel = useAction(cancelScheduledAction);
  const [value, setValue] = useState("");
  const byDay = (d: string) => items.filter((i) => i.date === d).sort((a, b) => a.time.localeCompare(b.time));

  const onDrop = (date: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const it = items.find((i) => i.id === id);
    if (!it?.local || !canEdit) return;
    move.run(id, `${date}T${it.time}`);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link href={`/admin/calendar?m=${prev}`} className="rounded-md border border-border p-2 hover:bg-secondary" aria-label="الشهر السابق">
          <ChevronRight className="h-4 w-4" />
        </Link>
        <h2 className="num min-w-32 text-center font-bold">{month}</h2>
        <Link href={`/admin/calendar?m=${next}`} className="rounded-md border border-border p-2 hover:bg-secondary" aria-label="الشهر التالي">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="ms-auto hidden flex-wrap gap-3 text-xs text-muted-foreground md:flex">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-sky-500/60" /> مجدول (اسحبه ليوم آخر)</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-primary/60" /> مواعيد ثابتة</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-destructive/60" /> خبر قوي</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-zinc-300 dark:bg-zinc-600" /> نُشر</span>
        </div>
      </div>
      <ActionMessage result={move.result ?? cancel.result} className="mb-3" />

      {/* شبكة الشهر (كمبيوتر) */}
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <div className="grid grid-cols-7 border-b border-border bg-card text-center text-xs text-muted-foreground">
          {WD.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => (
            <div
              key={d.date}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(d.date);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDrop(d.date, e)}
              className={cn(
                "min-h-28 border-b border-e border-border p-1.5",
                !d.inMonth && "bg-background/60 opacity-50",
                d.date === today && "bg-primary/5",
                dragOver === d.date && "bg-sky-500/10",
              )}
            >
              <p className={cn("num mb-1 text-xs", d.date === today ? "font-bold text-primary" : "text-muted-foreground")}>{Number(d.date.slice(8))}</p>
              <ul className="space-y-1">
                {byDay(d.date).slice(0, 5).map((i) => (
                  <li key={`${i.id}-${i.time}`}>
                    <button
                      draggable={i.type === "scheduled" && canEdit}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", i.id)}
                      onClick={() => {
                        if (i.type !== "scheduled") return;
                        setSelected(i);
                        setValue(i.local ?? "");
                      }}
                      className={cn("block w-full truncate rounded border px-1.5 py-0.5 text-start text-[11px]", TONE[i.type], i.type === "scheduled" && "cursor-grab")}
                      title={`${i.time} ${i.label}`}
                    >
                      <span className="num">{i.time}</span> {i.label}
                    </button>
                  </li>
                ))}
                {byDay(d.date).length > 5 && <li className="px-1 text-[10px] text-muted-foreground">+{byDay(d.date).length - 5}</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* قائمة (جوال) */}
      <ul className="space-y-3 md:hidden">
        {days
          .filter((d) => d.inMonth && byDay(d.date).length)
          .map((d) => (
            <li key={d.date} className="rounded-lg border border-border bg-card p-3">
              <p className={cn("num mb-2 text-sm font-semibold", d.date === today && "text-primary")}>{d.date}</p>
              <ul className="space-y-1.5">
                {byDay(d.date).map((i) => (
                  <li key={`${i.id}-${i.time}`}>
                    <button onClick={() => i.type === "scheduled" && (setSelected(i), setValue(i.local ?? ""))} className={cn("block w-full rounded border px-2 py-1.5 text-start text-xs", TONE[i.type])}>
                      <span className="num">{i.time}</span> {i.label}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
      </ul>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-5">
            <button onClick={() => setSelected(null)} className="absolute end-3 top-3" aria-label="إغلاق">
              <X className="h-4 w-4" />
            </button>
            <p className="mb-1 text-xs text-muted-foreground">منشور مجدول</p>
            <p className="mb-4 font-semibold">{selected.label}</p>
            {canEdit ? (
              <div className="space-y-3">
                <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" />
                <div className="flex gap-2">
                  <Button
                    disabled={move.pending}
                    onClick={async () => {
                      const r = await move.run(selected.id, value);
                      if (r.ok) setSelected(null);
                    }}
                  >
                    <Clock className="h-4 w-4" /> تغيير الموعد
                  </Button>
                  <Button
                    variant="outline"
                    disabled={cancel.pending}
                    onClick={async () => {
                      const r = await cancel.run(selected.id);
                      if (r.ok) setSelected(null);
                    }}
                  >
                    إلغاء الجدولة
                  </Button>
                </div>
                <ActionMessage result={move.result ?? cancel.result} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">دورك مشاهد فقط.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
