"use client";

import { MARKETS, NEWS_CATEGORIES, NEWS_SOURCE_META, type BotSettings } from "@qfx/shared";
import { CheckCircle2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { checkSourcesAction, type SourceCheck } from "@/app/admin/_actions/settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section, Switch } from "../ui";
import { Field, inputCls, TestButton, useSection } from "./common";

export function NewsSection({ initial, canEdit }: { initial: BotSettings["news"]; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("news", initial);
  const [checks, setChecks] = useState<SourceCheck[] | null>(null);
  const [checkMsg, setCheckMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const srcOn = (id: string, d: boolean) => v.sources[id] ?? d;
  const catOn = (id: string, d: boolean) => v.categories[id] ?? d;
  const checkOf = (id: string) => checks?.find((c) => c.id === id);

  return (
    <Section
      id="news"
      title="📰 الأخبار والمصادر"
      description="المصادر تُفحص كل دورة، والأخبار تمر على: الأنواع ← الكلمات ← كشف المكرر ← التقييم ← سياسة النشر."
      actions={canEdit && <TestButton what="news" label="جلب الآن" />}
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <Switch checked={v.enabled} disabled={!canEdit} onChange={(enabled) => set({ ...v, enabled })} label="نشر الأخبار تلقائياً" />
        <Switch checked={v.translate} disabled={!canEdit} onChange={(translate) => set({ ...v, translate })} label="ترجمة الأخبار الإنجليزية للعربية" description="ترجمة Google المجانية" />
        <Switch checked={v.show_tags} disabled={!canEdit} onChange={(show_tags) => set({ ...v, show_tags })} label="إظهار وسوم النوع (#الذهب...)" />
        <Switch checked={v.show_source} disabled={!canEdit} onChange={(show_source) => set({ ...v, show_source })} label="إظهار اسم المصدر ورابطه" />
        <Field label="الفحص كل (دقيقة)">
          <input className={inputCls} type="number" min={5} value={v.interval_min} disabled={!canEdit} onChange={(e) => set({ ...v, interval_min: Number(e.target.value) })} dir="ltr" />
        </Field>
        <Field label="أقصى عدد أخبار بالدورة">
          <input className={inputCls} type="number" min={1} max={20} value={v.max_per_run} disabled={!canEdit} onChange={(e) => set({ ...v, max_per_run: Number(e.target.value) })} dir="ltr" />
        </Field>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">المصادر</p>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              disabled={checking}
              onClick={async () => {
                setChecking(true);
                const r = await checkSourcesAction();
                setChecks(r.sources);
                setCheckMsg(r.message ?? "");
                setChecking(false);
              }}
            >
              <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} /> فحص المصادر من السيرفر
            </Button>
          )}
        </div>
        {checkMsg && <p className="mb-2 text-xs text-gold">{checkMsg}</p>}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {NEWS_SOURCE_META.map((src) => {
            const c = checkOf(src.id);
            return (
              <div key={src.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{src.label}</p>
                  {"note" in src && <p className="text-[11px] text-muted-foreground">{src.note}</p>}
                  {c && (
                    <p className={cn("flex items-center gap-1 text-[11px]", c.ok ? "text-success" : "text-destructive")}>
                      {c.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {c.ok ? `${c.count} خبر • ${c.ms}ms` : c.error}
                    </p>
                  )}
                </div>
                <Switch checked={srcOn(src.id, src.on)} disabled={!canEdit} onChange={(on) => set({ ...v, sources: { ...v.sources, [src.id]: on } })} />
              </div>
            );
          })}
        </div>
        <p className="mb-2 mt-4 text-sm font-semibold">مصادر RSS إضافية</p>
        <div className="space-y-2">
          {v.custom_feeds.map((f, i) => (
            <div key={f.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_2fr_auto_auto]">
              <input className={inputCls} placeholder="الاسم" value={f.label} disabled={!canEdit} onChange={(e) => set({ ...v, custom_feeds: v.custom_feeds.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <input className={inputCls} placeholder="https://.../rss" value={f.url} disabled={!canEdit} dir="ltr" onChange={(e) => set({ ...v, custom_feeds: v.custom_feeds.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              <Switch checked={f.on} disabled={!canEdit} onChange={(on) => set({ ...v, custom_feeds: v.custom_feeds.map((x, j) => (j === i ? { ...x, on } : x)) })} />
              {canEdit && (
                <Button size="sm" variant="ghost" onClick={() => set({ ...v, custom_feeds: v.custom_feeds.filter((_, j) => j !== i) })} aria-label="حذف">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => set({ ...v, custom_feeds: [...v.custom_feeds, { id: Date.now().toString(36), label: "", url: "", on: true }] })}>
              <Plus className="h-4 w-4" /> إضافة مصدر RSS
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold">أنواع الأخبار المنشورة</p>
          <div className="space-y-2">
            {NEWS_CATEGORIES.map((c) => (
              <Switch key={c.id} checked={catOn(c.id, c.on)} disabled={!canEdit} onChange={(on) => set({ ...v, categories: { ...v.categories, [c.id]: on } })} label={c.label} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">أسواق التركيز (ترفع تقييم الخبر)</p>
          <p className="mb-2 text-xs text-muted-foreground">الخبر الذي يخص هذه الأسواق يحصل على +30 في التقييم.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(MARKETS).map(([id, m]) => {
              const on = v.focus.includes(id);
              return (
                <button key={id} disabled={!canEdit} onClick={() => set({ ...v, focus: on ? v.focus.filter((x) => x !== id) : [...v.focus, id] })} className={cn("rounded-full border px-3 py-1.5 text-sm", on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {bar(canEdit)}
    </Section>
  );
}
