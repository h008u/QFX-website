"use client";

import type { BotSettings } from "@qfx/shared";
import { ListInput, Section, Switch } from "../ui";
import { Field, useSection } from "./common";

export function Mt5Section({ initial, canEdit }: { initial: BotSettings["mt5"]; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("mt5", initial);
  return (
    <Section title="⚙️ إعدادات الربط" description="الإضافة ترسل فقط ولا تنفذ صفقات. كل تحديث ينزل كرد على منشور الصفقة.">
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <Switch checked={v.enabled} disabled={!canEdit} onChange={(enabled) => set({ ...v, enabled })} label="تفعيل ربط MT5" description="عند الإطفاء تُسجَّل حالة الحساب فقط" />
        <Switch checked={v.publish_open} disabled={!canEdit} onChange={(publish_open) => set({ ...v, publish_open })} label="نشر الصفقة الجديدة" />
        <Switch checked={v.publish_modify} disabled={!canEdit} onChange={(publish_modify) => set({ ...v, publish_modify })} label="نشر تعديل الوقف/الهدف" />
        <Switch checked={v.publish_close} disabled={!canEdit} onChange={(publish_close) => set({ ...v, publish_close })} label="نشر الإغلاق والنتيجة بالنقاط" />
        <Field label="الرموز المسموحة (فارغ = الكل)" hint="سطر لكل رمز — XAUUSD يطابق XAUUSDm و XAUUSD.pro">
          <ListInput value={v.symbols} onChange={(symbols) => set({ ...v, symbols })} placeholder={"XAUUSD\nEURUSD"} rows={3} />
        </Field>
      </div>
      {bar(canEdit)}
    </Section>
  );
}
