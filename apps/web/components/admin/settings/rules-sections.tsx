"use client";

import {
  decidePolicy, fillTemplate, POLICY_KINDS, POLICY_MODE_LABEL, templateFields,
  type BotSettings, type PolicyKind, type PolicyMode, type PostTemplate,
} from "@qfx/shared";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TelegramPreview } from "../telegram-preview";
import { ListInput, Section, Switch } from "../ui";
import { Field, inputCls, useSection } from "./common";

export function WordsSection({ initial, canEdit }: { initial: BotSettings["rules"]; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("rules", initial);
  return (
    <Section id="words" title="🔤 الكلمات وساعات الهدوء" description="كل سطر كلمة. المطابقة بدون حساسية لحالة الأحرف وتشمل جزء الكلمة.">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Field label="⛔ كلمات ممنوعة" hint="الخبر الذي يحتويها لا ينزل (ينفلتر ويبقى بالسجل)">
          <ListInput value={v.banned} onChange={(banned) => set({ ...v, banned })} placeholder={"sponsored\nإعلان"} rows={6} />
        </Field>
        <Field label="✅ كلمات مطلوبة" hint="إذا لم تكن فارغة: الخبر لازم يحتوي واحدة منها على الأقل">
          <ListInput value={v.required} onChange={(required) => set({ ...v, required })} placeholder={"gold\nالذهب"} rows={6} />
        </Field>
        <Field label="👁 كلمات مراقبة" hint="أي خبر يحتويها يوصلك بخاص البوت مع زر «انشره» حتى لو انفلتر">
          <ListInput value={v.watch} onChange={(watch) => set({ ...v, watch })} placeholder={"powell\nباول\nnfp"} rows={6} />
        </Field>
      </div>
      <div className="mt-6 rounded-lg border border-border p-4">
        <Switch checked={v.quiet.enabled} disabled={!canEdit} onChange={(enabled) => set({ ...v, quiet: { ...v.quiet, enabled } })} label="🌙 ساعات الهدوء" description="الأخبار والتنبيهات تتأجل وتنزل بعد انتهاء الفترة (آخر 5 أخبار فقط حتى لا تنغرق القناة)." />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="من">
            <input type="time" className={inputCls} value={v.quiet.start} disabled={!canEdit} onChange={(e) => set({ ...v, quiet: { ...v.quiet, start: e.target.value } })} dir="ltr" />
          </Field>
          <Field label="إلى">
            <input type="time" className={inputCls} value={v.quiet.end} disabled={!canEdit} onChange={(e) => set({ ...v, quiet: { ...v.quiet, end: e.target.value } })} dir="ltr" />
          </Field>
          <div className="col-span-2 flex items-end">
            <Switch checked={v.quiet.allowBreaking} disabled={!canEdit} onChange={(allowBreaking) => set({ ...v, quiet: { ...v.quiet, allowBreaking } })} label="العاجل يمرّ حتى بساعات الهدوء" />
          </div>
        </div>
      </div>
      {bar(canEdit)}
    </Section>
  );
}

/** سياسة النشر لكل نوع مع شريط يوضح توزيع آخر التقييمات وما كان سيحدث بالحدود المختارة */
export function PolicySection({ initial, scores, canEdit }: { initial: BotSettings["policy"]; scores: Record<PolicyKind, number[]>; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("policy", initial);
  return (
    <Section id="policy" title="⚖️ سياسة النشر" description="تلقائي: ينزل مباشرة. بموافقتك: ينتظرك بالمراجعة وبخاص البوت. حسب الأهمية: فوق حد التلقائي ينزل، بين الحدين ينتظرك، وتحت حد الموافقة يُحجب (ويبقى بالسجل).">
      <div className="space-y-5">
        {(Object.keys(POLICY_KINDS) as PolicyKind[]).map((k) => {
          const r = v[k];
          const sc = scores[k] ?? [];
          const sim = { auto: 0, pending: 0, blocked: 0 };
          sc.forEach((x) => sim[decidePolicy(r, x)]++);
          const buckets = Array.from({ length: 10 }, (_, i) => sc.filter((x) => Math.min(9, Math.floor(x / 10)) === i).length);
          const max = Math.max(1, ...buckets);
          return (
            <div key={k} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold">{POLICY_KINDS[k]}</p>
                <div className="ms-auto flex gap-1 rounded-md bg-secondary p-1">
                  {(Object.keys(POLICY_MODE_LABEL) as PolicyMode[]).map((m) => (
                    <button key={m} disabled={!canEdit} onClick={() => set({ ...v, [k]: { ...r, mode: m } })} className={cn("rounded px-3 py-1 text-xs", r.mode === m ? "bg-background font-semibold text-foreground" : "text-muted-foreground")}>
                      {POLICY_MODE_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>
              {r.mode === "score" && (
                <div className="mt-4 space-y-3">
                  <div className="flex h-16 items-end gap-1" dir="ltr">
                    {buckets.map((n, i) => {
                      const mid = i * 10 + 5;
                      const tone = mid >= r.auto ? "bg-success" : mid >= r.approve ? "bg-primary/60" : "bg-zinc-600";
                      return <div key={i} className={cn("flex-1 rounded-t", tone)} style={{ height: `${(n / max) * 100}%`, minHeight: n ? 3 : 1 }} title={`${i * 10}–${i * 10 + 9}: ${n}`} />;
                    })}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label={`حد النشر التلقائي: ${r.auto}`}>
                      <input type="range" dir="ltr" min={0} max={100} value={r.auto} disabled={!canEdit} onChange={(e) => set({ ...v, [k]: { ...r, auto: Math.max(Number(e.target.value), r.approve) } })} className="w-full accent-[hsl(var(--primary))]" />
                    </Field>
                    <Field label={`حد الموافقة: ${r.approve}`}>
                      <input type="range" dir="ltr" min={0} max={100} value={r.approve} disabled={!canEdit} onChange={(e) => set({ ...v, [k]: { ...r, approve: Math.min(Number(e.target.value), r.auto) } })} className="w-full accent-[hsl(var(--primary))]" />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    على آخر <span className="num">{sc.length}</span> عنصر: كان سينزل <b className="num text-success">{sim.auto}</b>، وينتظرك <b className="num text-primary">{sim.pending}</b>، ويُحجب <b className="num">{sim.blocked}</b>.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {bar(canEdit)}
    </Section>
  );
}

export function TemplatesSection({ initial, canEdit }: { initial: PostTemplate[]; canEdit: boolean }) {
  const { value, setValue, bar } = useSection("templates", initial);
  const [active, setActive] = useState(0);
  const t = value[active];
  const update = (patch: Partial<PostTemplate>) => setValue(value.map((x, i) => (i === active ? { ...x, ...patch } : x)));
  const move = (dir: -1 | 1) => {
    const j = active + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[active], next[j]] = [next[j], next[active]];
    setValue(next);
    setActive(j);
  };
  const sample = t ? Object.fromEntries(templateFields(t.body).map((f) => [f, f === "الرمز" ? "XAUUSD" : /الدخول|الوقف|الهدف/.test(f) ? "2650" : f])) : {};
  return (
    <Section id="templates" title="🧩 قوالب المنشورات" description="تظهر في صفحة «منشور جديد». أي كلمة بين { } تصير خانة، والسطر الذي تبقى خاناته فارغة يُحذف تلقائياً.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-1">
          {value.map((x, i) => (
            <button key={x.id} onClick={() => setActive(i)} className={cn("block w-full truncate rounded-md px-3 py-2 text-start text-sm", i === active ? "bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/60")}>
              {x.name}
            </button>
          ))}
          {canEdit && (
            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => { setValue([...value, { id: Date.now().toString(36), name: "قالب جديد", body: "**{العنوان}**\n\n{النص}" }]); setActive(value.length); }}>
              <Plus className="h-4 w-4" /> قالب جديد
            </Button>
          )}
        </div>
        {t ? (
          <div className="space-y-3">
            <Field label="الاسم">
              <input className={inputCls} value={t.name} disabled={!canEdit} onChange={(e) => update({ name: e.target.value })} />
            </Field>
            <Field label="النص">
              <textarea rows={12} value={t.body} disabled={!canEdit} onChange={(e) => update({ body: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6" dir="auto" />
            </Field>
            <p className="text-xs text-muted-foreground">الخانات: {templateFields(t.body).join("، ") || "—"}</p>
            {canEdit && (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => move(-1)} aria-label="لأعلى"><ArrowUp className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => move(1)} aria-label="لأسفل"><ArrowDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { setValue(value.filter((_, i) => i !== active)); setActive(0); }}>
                  <Trash2 className="h-4 w-4" /> حذف
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">لا قوالب</p>
        )}
        {t && (
          <div>
            <p className="mb-2 text-sm font-semibold">معاينة بقيم تجريبية</p>
            <TelegramPreview body={fillTemplate(t.body, sample)} />
          </div>
        )}
      </div>
      {bar(canEdit)}
    </Section>
  );
}
