"use client";

import { destinationAccepts, fillTemplate, templateFields, type Destination, type PostTemplate } from "@qfx/shared";
import { Bold, Clock, FileText, Image as ImageIcon, Italic, Link2, Send, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { createPostAction } from "@/app/admin/_actions/posts";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TelegramPreview } from "./telegram-preview";
import { ActionMessage, Switch, useAction } from "./ui";

export function Composer({
  templates,
  media,
  signature,
  disclaimerText,
  destinations,
  defaultSchedule,
  timezone,
}: {
  templates: PostTemplate[];
  media: string[];
  signature: string;
  disclaimerText: string;
  destinations: Destination[];
  defaultSchedule: string;
  timezone: string;
}) {
  const [body, setBody] = useState("");
  const [tpl, setTpl] = useState<PostTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState("");
  const [showLib, setShowLib] = useState(false);
  const [disclaimer, setDisclaimer] = useState(false);
  const [when, setWhen] = useState<"now" | "schedule" | "draft">("now");
  const [at, setAt] = useState(defaultSchedule);
  const ref = useRef<HTMLTextAreaElement>(null);
  const create = useAction(createPostAction);

  const fields = useMemo(() => (tpl ? templateFields(tpl.body) : []), [tpl]);
  const text = tpl ? fillTemplate(tpl.body, values) : body;
  const targets = destinations.filter((d) => destinationAccepts(d, "manual"));

  const wrap = (before: string, after = before) => {
    const el = ref.current;
    if (!el || tpl) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = body.slice(a, b) || "نص";
    setBody(body.slice(0, a) + before + sel + after + body.slice(b));
    requestAnimationFrame(() => el.focus());
  };

  const reset = () => {
    setBody("");
    setTpl(null);
    setValues({});
    setPhoto("");
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5">
        <div>
          <Label>قالب جاهز</Label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTpl(null)} className={cn("rounded-full border px-3 py-1.5 text-xs", !tpl ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
              <FileText className="me-1 inline h-3.5 w-3.5" /> نص حر
            </button>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTpl(t);
                  setValues({});
                }}
                className={cn("rounded-full border px-3 py-1.5 text-xs", tpl?.id === t.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {tpl ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f} className={cn(/ملاحظة|التحليل|الخبر|التحديث|التأثير/.test(f) && "sm:col-span-2")}>
                <Label>{f}</Label>
                {/ملاحظة|التحليل|الخبر|التحديث|التأثير/.test(f) ? (
                  <textarea
                    value={values[f] ?? ""}
                    onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ) : (
                  <Input value={values[f] ?? ""} onChange={(e) => setValues({ ...values, [f]: e.target.value })} dir="auto" />
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground sm:col-span-2">السطر الذي تتركه فارغاً يُحذف تلقائياً. القوالب تتعدل من «القواعد والقوالب».</p>
          </div>
        ) : (
          <div>
            <div className="mb-1.5 flex items-center gap-1">
              <Label className="mb-0 me-auto">النص</Label>
              <button onClick={() => wrap("**")} className="rounded p-1.5 hover:bg-secondary" title="عريض" aria-label="عريض"><Bold className="h-4 w-4" /></button>
              <button onClick={() => wrap("__")} className="rounded p-1.5 hover:bg-secondary" title="مائل" aria-label="مائل"><Italic className="h-4 w-4" /></button>
              <button onClick={() => wrap("[", "](https://)")} className="rounded p-1.5 hover:bg-secondary" title="رابط" aria-label="رابط"><Link2 className="h-4 w-4" /></button>
            </div>
            <textarea
              ref={ref}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              dir="auto"
              placeholder={"اكتب منشورك...\n**عريض**  __مائل__  [نص](رابط)"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="num mt-1 text-end text-[11px] text-muted-foreground">{text.length}/4000</p>
          </div>
        )}

        <div>
          <Label>صورة (اختياري)</Label>
          <div className="flex gap-2">
            <Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://..." dir="ltr" />
            <Button type="button" variant="outline" onClick={() => setShowLib((v) => !v)}>
              <ImageIcon className="h-4 w-4" /> من المكتبة
            </Button>
            {photo && (
              <Button type="button" variant="ghost" onClick={() => setPhoto("")} aria-label="إزالة الصورة">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {showLib && (
            <div className="mt-2 grid grid-cols-4 gap-2 rounded-md border border-border p-2 sm:grid-cols-6">
              {media.map((url) => (
                <button key={url} onClick={() => { setPhoto(url); setShowLib(false); }} className="aspect-square overflow-hidden rounded border border-border hover:border-primary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              {!media.length && <p className="col-span-full p-3 text-center text-xs text-muted-foreground">المكتبة فارغة — ارفع صوراً من «مكتبة الصور».</p>}
            </div>
          )}
        </div>

        <Switch checked={disclaimer} onChange={setDisclaimer} label="إضافة تحذير «ليس توصية مالية»" description={disclaimerText} />

        <div className="rounded-lg border border-border p-4">
          <Label>موعد النشر</Label>
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ["now", "الآن"],
                ["schedule", "جدولة"],
                ["draft", "مسودة"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} onClick={() => setWhen(k)} className={cn("rounded-md border px-4 py-2 text-sm", when === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
                {l}
              </button>
            ))}
          </div>
          {when === "schedule" && (
            <div className="flex flex-wrap items-center gap-2">
              <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="w-auto" dir="ltr" />
              <span className="text-xs text-muted-foreground">بتوقيت {timezone}</span>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            ينزل في: {targets.length ? targets.map((d) => d.label).join("، ") : "القناة الافتراضية"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            disabled={create.pending || !text.trim()}
            onClick={async () => {
              const r = await create.run({ body: text, photo_url: photo || null, disclaimer, when, scheduled_local: when === "schedule" ? at : null });
              if (r.ok) reset();
            }}
          >
            {when === "schedule" ? <Clock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {create.pending ? "جارٍ..." : when === "now" ? "انشر الآن" : when === "schedule" ? "جدولة" : "حفظ كمسودة"}
          </Button>
          <ActionMessage result={create.result} />
        </div>
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <p className="mb-2 text-sm font-semibold">المعاينة</p>
        <TelegramPreview body={text} photo={photo || null} signature={signature} disclaimer={disclaimer ? disclaimerText : null} />
      </div>
    </div>
  );
}
