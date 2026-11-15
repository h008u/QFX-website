"use client";

import { DESTINATION_LANGS, POST_KIND_LABEL, type Destination, type PostKind } from "@qfx/shared";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { checkDestinationAction, type DestinationCheck } from "@/app/admin/_actions/settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section, Switch } from "../ui";
import { Field, inputCls, useSection } from "./common";

const KINDS = Object.keys(POST_KIND_LABEL) as PostKind[];

function DestinationRow({ d, onChange, onRemove, canEdit }: { d: Destination; onChange: (d: Destination) => void; onRemove: () => void; canEdit: boolean }) {
  const [check, setCheck] = useState<DestinationCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const all = d.kinds === "all";
  const kinds = all ? KINDS : (d.kinds as PostKind[]);
  return (
    <div className={cn("rounded-lg border border-border p-4", !d.enabled && "opacity-60")}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_110px_130px_auto]">
        <Field label="الاسم">
          <input className={inputCls} value={d.label} disabled={!canEdit} onChange={(e) => onChange({ ...d, label: e.target.value })} />
        </Field>
        <Field label="القناة أو المجموعة" hint="@channel أو -100…">
          <input className={inputCls} value={d.chat_id} disabled={!canEdit} onChange={(e) => onChange({ ...d, chat_id: e.target.value.trim() })} dir="ltr" />
        </Field>
        <Field label="موضوع (Topic)" hint="اختياري">
          <input className={inputCls} type="number" value={d.thread_id ?? ""} disabled={!canEdit} onChange={(e) => onChange({ ...d, thread_id: e.target.value ? Number(e.target.value) : null })} dir="ltr" />
        </Field>
        <Field label="اللغة" hint="ترجمة تلقائية">
          <select className={inputCls} value={d.lang ?? ""} disabled={!canEdit} onChange={(e) => onChange({ ...d, lang: e.target.value || null })}>
            <option value="">العربية (الأصل)</option>
            {Object.entries(DESTINATION_LANGS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-end gap-2 pb-0.5">
          <Switch checked={d.enabled} disabled={!canEdit} onChange={(enabled) => onChange({ ...d, enabled })} label="مفعّل" />
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-xs text-muted-foreground">ما الذي ينزل هنا؟</p>
        <div className="flex flex-wrap gap-1.5">
          <button disabled={!canEdit} onClick={() => onChange({ ...d, kinds: all ? [] : "all" })} className={cn("rounded-full border px-2.5 py-1 text-xs", all ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
            الكل
          </button>
          {KINDS.map((k) => {
            const on = kinds.includes(k);
            return (
              <button
                key={k}
                disabled={!canEdit}
                onClick={() => onChange({ ...d, kinds: on ? KINDS.filter((x) => x !== k && kinds.includes(x)) : [...kinds, k] })}
                className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground")}
              >
                {POST_KIND_LABEL[k]}
              </button>
            );
          })}
        </div>
      </div>
      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={checking || !d.chat_id}
            onClick={async () => {
              setChecking(true);
              setCheck(await checkDestinationAction(d.chat_id, d.thread_id ?? null));
              setChecking(false);
            }}
          >
            <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} /> فحص الصلاحيات
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4" /> حذف
          </Button>
          {check && (
            <span className={cn("text-xs", check.ok ? "text-success" : "text-destructive")}>
              {check.ok ? `✅ جاهز — ${check.title} (${check.type})` : `⚠️ ${check.problems.join("، ")}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function DestinationsSection({ initial, canEdit }: { initial: Destination[]; canEdit: boolean }) {
  const { value, setValue, bar } = useSection("destinations", initial);
  return (
    <Section
      id="destinations"
      title="📍 أماكن النشر"
      description="قناة أو أكثر، ومجموعات، ومواضيع داخل المجموعات. لكل مكان تختار أنواع المحتوى التي تنزل فيه. إذا فشل مكان يكمل الباقي. اكتب /id داخل المجموعة أو الموضوع ليعطيك البوت المعرّف."
    >
      <div className="space-y-3">
        {value.map((d, i) => (
          <DestinationRow
            key={d.id}
            d={d}
            canEdit={canEdit}
            onChange={(nd) => setValue(value.map((x, j) => (j === i ? nd : x)))}
            onRemove={() => setValue(value.filter((_, j) => j !== i))}
          />
        ))}
        {!value.length && <p className="text-sm text-muted-foreground">لم تُضف أماكن بعد — البوت يستخدم TELEGRAM_CHANNEL_ID لكل الأنواع.</p>}
        {canEdit && value.length < 10 && (
          <Button size="sm" variant="outline" onClick={() => setValue([...value, { id: `d${Date.now().toString(36)}`, chat_id: "", label: "", kinds: "all", enabled: true }])}>
            <Plus className="h-4 w-4" /> إضافة مكان نشر
          </Button>
        )}
      </div>
      {bar(canEdit)}
    </Section>
  );
}
