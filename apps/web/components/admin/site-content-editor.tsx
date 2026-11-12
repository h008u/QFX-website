"use client";

import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, GripVertical, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { saveSiteContentAction } from "@/app/_actions/site-content";
import { Button, buttonVariants } from "@/components/ui/button";
import { DEFAULT_CONTENT, HOME_SECTION_LABEL, TEXT_FIELDS, type SiteContent } from "@/config/site-content";
import { usePointerReorder } from "@/components/site-editor/reorder";
import { cn } from "@/lib/utils";
import { inputCls } from "./settings/common";
import { ActionMessage, Section, Switch, useAction } from "./ui";

const GROUPS: [string, string][] = [
  ["hero", "الواجهة الرئيسية"],
  ["market", "ملخص السوق"],
  ["ideas", "التوصيات"],
  ["news", "الأخبار"],
  ["telegram", "بطاقة تيليجرام"],
  ["why", "لماذا QFX"],
  ["broker", "الوسيط الشريك"],
  ["steps", "الخطوات"],
  ["join", "الانضمام"],
  ["footer", "التذييل"],
];

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const a = [...arr];
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}

/** محرر قائمة عناصر (لماذا / الخطوات / الأسئلة) مع إضافة وحذف وترتيب */
function Repeater<T extends Record<string, string>>({
  items,
  onChange,
  fields,
  blank,
  disabled,
  max,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  fields: [keyof T & string, string, boolean][];
  blank: T;
  disabled: boolean;
  max: number;
}) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <span className="font-semibold">#{i + 1}</span>
            <span className="ms-auto" />
            <button disabled={disabled || i === 0} onClick={() => onChange(move(items, i, i - 1))} className="rounded p-1 hover:bg-secondary disabled:opacity-30" aria-label="لأعلى">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button disabled={disabled || i === items.length - 1} onClick={() => onChange(move(items, i, i + 1))} className="rounded p-1 hover:bg-secondary disabled:opacity-30" aria-label="لأسفل">
              <ArrowDown className="h-4 w-4" />
            </button>
            <button disabled={disabled} onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded p-1 text-down hover:bg-secondary disabled:opacity-30" aria-label="حذف">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2">
            {fields.map(([f, label, multi]) =>
              multi ? (
                <textarea
                  key={f}
                  className={cn(inputCls, "h-auto min-h-[72px] py-2")}
                  placeholder={label}
                  value={it[f]}
                  disabled={disabled}
                  onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f]: e.target.value } : x)))}
                />
              ) : (
                <input
                  key={f}
                  className={inputCls}
                  placeholder={label}
                  value={it[f]}
                  disabled={disabled}
                  onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f]: e.target.value } : x)))}
                />
              ),
            )}
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onChange([...items, { ...blank }])}>
          <Plus className="h-4 w-4" /> إضافة
        </Button>
      )}
    </div>
  );
}

export function SiteContentEditor({ initial, canEdit }: { initial: SiteContent; canEdit: boolean }) {
  const [c, setC] = useState<SiteContent>(initial);
  const [saved, setSaved] = useState<SiteContent>(initial);
  const reorder = usePointerReorder((a, b) => setC((v) => ({ ...v, sections: move(v.sections, a, b) })));
  const save = useAction(async (v: SiteContent) => {
    const r = await saveSiteContentAction(v);
    if (r.ok) setSaved(v);
    return r;
  });
  const dirty = JSON.stringify(c) !== JSON.stringify(saved);
  const ro = !canEdit;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <a href="/?edit=1" target="_blank" rel="noopener" className={buttonVariants({ variant: "default" })}>
          <ExternalLink className="h-4 w-4" /> التعديل المباشر على الصفحة
        </a>
        <a href="/" target="_blank" rel="noopener" className={buttonVariants({ variant: "outline" })}>
          عرض الموقع
        </a>
      </div>

      <Section id="sections" title="🧩 أقسام الصفحة الرئيسية" description="اسحب القسم من المقبض لتغيير ترتيبه، أو استخدم الأسهم. العين تُظهر القسم أو تخفيه عن الزوار.">
        <ul className="space-y-2">
          {c.sections.map((s, i) => (
            <li
              key={s.id}
              data-reorder-idx={i}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 transition-shadow",
                reorder.over === i && reorder.from !== null && reorder.from !== i && (reorder.from > i ? "shadow-[0_-3px_0_0_hsl(var(--primary))]" : "shadow-[0_3px_0_0_hsl(var(--primary))]"),
                reorder.from === i && "opacity-50",
                !s.visible && "opacity-60",
              )}
            >
              <span
                onPointerDown={ro ? undefined : reorder.start(i)}
                className={cn("touch-none text-muted-foreground", !ro && "cursor-grab active:cursor-grabbing")}
                title="اسحب لتغيير الترتيب"
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <span className="num w-5 text-xs text-muted-foreground">{i + 1}</span>
              <span className={cn("font-semibold", !s.visible && "line-through")}>{HOME_SECTION_LABEL[s.id]}</span>
              <span className="ms-auto flex items-center gap-1">
                <button disabled={ro || i === 0} onClick={() => setC({ ...c, sections: move(c.sections, i, i - 1) })} className="rounded p-1.5 hover:bg-secondary disabled:opacity-30" aria-label="لأعلى">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button disabled={ro || i === c.sections.length - 1} onClick={() => setC({ ...c, sections: move(c.sections, i, i + 1) })} className="rounded p-1.5 hover:bg-secondary disabled:opacity-30" aria-label="لأسفل">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  disabled={ro}
                  onClick={() => setC({ ...c, sections: c.sections.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)) })}
                  className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-semibold hover:bg-secondary"
                >
                  {s.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {s.visible ? "ظاهر" : "مخفي"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="announcement" title="📣 شريط الإعلان" description="شريط ملوّن أعلى كل صفحات الموقع لعرض أو خبر مهم.">
        <div className="grid gap-4 md:grid-cols-[auto_1fr_1fr] md:items-end">
          <Switch checked={c.announcement.visible} disabled={ro} onChange={(visible) => setC({ ...c, announcement: { ...c.announcement, visible } })} label="إظهار الشريط" />
          <input className={inputCls} value={c.announcement.text} disabled={ro} onChange={(e) => setC({ ...c, announcement: { ...c.announcement, text: e.target.value } })} placeholder="نص الإعلان" />
          <input className={inputCls} value={c.announcement.href} disabled={ro} dir="ltr" onChange={(e) => setC({ ...c, announcement: { ...c.announcement, href: e.target.value } })} placeholder="/#join أو https://..." />
        </div>
      </Section>

      <Section id="texts" title="✏️ النصوص" description="كل نص ظاهر في الصفحة الرئيسية والتذييل. اترك الحقل فارغاً لاستعادة النص الافتراضي.">
        <div className="space-y-6">
          {GROUPS.map(([g, label]) => (
            <div key={g}>
              <p className="mb-2 text-sm font-bold">{label}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(TEXT_FIELDS)
                  .filter(([k]) => k.startsWith(g + "."))
                  .map(([k, [desc, def, max]]) => (
                    <label key={k} className={cn("block", max > 120 && "md:col-span-2")}>
                      <span className="mb-1 block text-xs text-muted-foreground">{desc}</span>
                      {max > 120 ? (
                        <textarea className={cn(inputCls, "h-auto min-h-[72px] py-2")} maxLength={max} value={c.texts[k] ?? ""} placeholder={def} disabled={ro} onChange={(e) => setC({ ...c, texts: { ...c.texts, [k]: e.target.value } })} />
                      ) : (
                        <input className={inputCls} maxLength={max} value={c.texts[k] ?? ""} placeholder={def} disabled={ro} onChange={(e) => setC({ ...c, texts: { ...c.texts, [k]: e.target.value } })} />
                      )}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section id="why" title="⭐ لماذا QFX" description="بطاقات المزايا في الصفحة الرئيسية.">
          <Repeater items={c.why} onChange={(why) => setC({ ...c, why })} fields={[["title", "العنوان", false], ["text", "الوصف", true]]} blank={{ title: "", text: "" }} disabled={ro} max={8} />
        </Section>
        <Section id="steps" title="🪜 خطوات الانضمام" description="تظهر في الرئيسية وصفحة «كيف نعمل».">
          <Repeater items={c.steps} onChange={(steps) => setC({ ...c, steps })} fields={[["title", "العنوان", false], ["text", "الوصف", true]]} blank={{ title: "", text: "" }} disabled={ro} max={8} />
        </Section>
      </div>

      <Section id="faqs" title="❓ الأسئلة الشائعة" description="تظهر في صفحة «كيف نعمل».">
        <Repeater items={c.faqs} onChange={(faqs) => setC({ ...c, faqs })} fields={[["q", "السؤال", false], ["a", "الإجابة", true]]} blank={{ q: "", a: "" }} disabled={ro} max={30} />
      </Section>

      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:start-[250px]">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
            <Button disabled={!dirty || save.pending} onClick={() => save.run(c)}>
              <Save className="h-4 w-4" /> {save.pending ? "جارٍ الحفظ..." : "حفظ ونشر"}
            </Button>
            <Button variant="outline" disabled={!dirty} onClick={() => setC(saved)}>
              تراجع
            </Button>
            <Button variant="ghost" onClick={() => confirm("استعادة كل المحتوى الافتراضي؟ (لن يُحفظ حتى تضغط حفظ)") && setC(DEFAULT_CONTENT)}>
              <RotateCcw className="h-4 w-4" /> الافتراضي
            </Button>
            {dirty && !save.result && <span className="text-xs text-gold">تغييرات غير محفوظة</span>}
            <ActionMessage result={save.result} />
          </div>
        </div>
      )}
    </div>
  );
}
