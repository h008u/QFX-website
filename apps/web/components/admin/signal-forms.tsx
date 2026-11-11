"use client";

import { STATUS_LABEL, type Signal } from "@qfx/shared";
import { useActionState } from "react";
import { createSignalAction, updateSignalAction } from "@/app/admin/_actions/signals";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionMessage, Section } from "./ui";

const init = { ok: false, message: "" };

export function NewSignalForm() {
  const [state, action, pending] = useActionState(createSignalAction, init);
  return (
    <Section id="new" title="📤 توصية جديدة" description="تُحفظ وتُنشر فوراً في كل أماكن النشر التي تقبل التوصيات، وتظهر في صفحة التوصيات بالموقع.">
      <form action={action} className="grid grid-cols-2 gap-3">
        <div>
          <Label>الأداة</Label>
          <Input name="symbol" placeholder="XAUUSD" required dir="ltr" />
        </div>
        <div>
          <Label>الاتجاه</Label>
          <Select name="direction" defaultValue="BUY">
            <option value="BUY">شراء BUY</option>
            <option value="SELL">بيع SELL</option>
          </Select>
        </div>
        {(
          [
            ["entry_price", "سعر الدخول", true],
            ["stop_loss", "وقف الخسارة", true],
            ["take_profit_1", "الهدف 1", true],
            ["take_profit_2", "الهدف 2", false],
            ["take_profit_3", "الهدف 3", false],
          ] as const
        ).map(([n, l, req]) => (
          <div key={n}>
            <Label>{l}</Label>
            <Input name={n} type="number" step="any" required={req} dir="ltr" />
          </div>
        ))}
        <div className="col-span-2">
          <Label>ملاحظات</Label>
          <Textarea name="notes" rows={2} />
        </div>
        <div className="col-span-2 space-y-2">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "جارٍ النشر..." : "نشر التوصية"}
          </Button>
          <ActionMessage result={state} />
        </div>
      </form>
    </Section>
  );
}

export function UpdateSignalForm({ signals }: { signals: Signal[] }) {
  const [state, action, pending] = useActionState(updateSignalAction, init);
  return (
    <Section title="🔔 تحديث توصية" description="يُرسل كرد على رسالة التوصية الأصلية في كل مكان نشر، والنقاط تُحسب تلقائياً.">
      <form action={action} className="grid gap-3">
        <div>
          <Label>التوصية</Label>
          <Select name="id" required>
            {signals.map((s) => (
              <option key={s.id} value={s.id}>
                {s.symbol} {s.direction} @ {Number(s.entry_price)} — {STATUS_LABEL[s.status]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>الحالة الجديدة</Label>
            <Select name="status" defaultValue="tp_hit">
              {(["tp_hit", "sl_hit", "closed", "cancelled", "open"] as const).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>سعر الخروج (للإغلاق اليدوي)</Label>
            <Input name="exit_price" type="number" step="any" dir="ltr" />
          </div>
        </div>
        <div>
          <Label>ملاحظة</Label>
          <Input name="notes" placeholder="مثال: نقل الوقف لنقطة الدخول" />
        </div>
        <Button type="submit" variant="secondary" disabled={pending || !signals.length}>
          {pending ? "جارٍ التحديث..." : "تحديث"}
        </Button>
        <ActionMessage result={state} />
      </form>
    </Section>
  );
}
