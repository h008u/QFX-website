"use client";

import type { BotSettings, SettingsKey } from "@qfx/shared";
import { Save } from "lucide-react";
import { useState } from "react";
import { runTestAction, saveSettingsAction } from "@/app/admin/_actions/settings";
import { Button } from "@/components/ui/button";
import { ActionMessage, useAction } from "../ui";

/** حالة قسم إعدادات + زر حفظ */
export function useSection<K extends SettingsKey>(key: K, initial: BotSettings[K]) {
  const [value, setValue] = useState<BotSettings[K]>(initial);
  const save = useAction(saveSettingsAction);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  const bar = (canEdit: boolean) =>
    canEdit ? (
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button size="sm" disabled={save.pending || !dirty} onClick={() => save.run(key, value)}>
          <Save className="h-4 w-4" /> {save.pending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
        {dirty && !save.result && <span className="text-xs text-gold">تغييرات غير محفوظة</span>}
        <ActionMessage result={save.result} />
      </div>
    ) : null;
  return { value, setValue, bar };
}

export function TestButton({ what, label }: { what: string; label: string }) {
  const t = useAction(runTestAction);
  return (
    <span className="inline-flex flex-col">
      <Button size="sm" variant="outline" disabled={t.pending} onClick={() => t.run(what)}>
        {t.pending ? "..." : `🧪 ${label}`}
      </Button>
      <ActionMessage result={t.result} className="mt-1 max-w-56 text-[11px]" />
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const inputCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
export const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
