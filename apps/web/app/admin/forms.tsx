"use client";

import { ASSET_LABEL, IMPACT_LABEL, NEWS_KIND_LABEL, STATUS_LABEL, type Signal } from "@qfx/shared";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createNewsAction, createSignalAction, updateSignalAction, type ActionState } from "./actions";

const initial: ActionState = { ok: false, message: "" };

function Result({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={cn("text-sm", state.ok ? "text-success" : "text-destructive")}>{state.message}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function NewSignalForm() {
  const [state, action, pending] = useActionState(createSignalAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>📤 توصية جديدة</CardTitle>
        <CardDescription>تُحفظ في قاعدة البيانات وتُنشر فوراً في قناة تيليجرام وصفحة التوصيات.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid grid-cols-2 gap-3">
          <Field label="الأداة">
            <Input name="symbol" placeholder="XAUUSD" required dir="ltr" />
          </Field>
          <Field label="الاتجاه">
            <Select name="direction" defaultValue="BUY">
              <option value="BUY">شراء BUY</option>
              <option value="SELL">بيع SELL</option>
            </Select>
          </Field>
          <Field label="سعر الدخول">
            <Input name="entry_price" type="number" step="any" required dir="ltr" />
          </Field>
          <Field label="وقف الخسارة">
            <Input name="stop_loss" type="number" step="any" required dir="ltr" />
          </Field>
          <Field label="الهدف 1">
            <Input name="take_profit_1" type="number" step="any" required dir="ltr" />
          </Field>
          <Field label="الهدف 2 (اختياري)">
            <Input name="take_profit_2" type="number" step="any" dir="ltr" />
          </Field>
          <Field label="الهدف 3 (اختياري)">
            <Input name="take_profit_3" type="number" step="any" dir="ltr" />
          </Field>
          <div className="col-span-2">
            <Field label="ملاحظات">
              <Textarea name="notes" rows={2} />
            </Field>
          </div>
          <div className="col-span-2 space-y-2">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "جارٍ النشر..." : "نشر التوصية"}
            </Button>
            <Result state={state} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function UpdateSignalForm({ signals }: { signals: Signal[] }) {
  const [state, action, pending] = useActionState(updateSignalAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>🔔 تحديث توصية</CardTitle>
        <CardDescription>يُرسل التحديث كرد على رسالة التوصية الأصلية في القناة، وتُحسب النقاط تلقائياً.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <Field label="التوصية">
            <Select name="id" required>
              {signals.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.symbol} {s.direction} @ {s.entry_price} — {STATUS_LABEL[s.status]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الحالة الجديدة">
              <Select name="status" defaultValue="tp_hit">
                {(["tp_hit", "sl_hit", "closed", "cancelled", "open"] as const).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="سعر الخروج (للإغلاق اليدوي)">
              <Input name="exit_price" type="number" step="any" dir="ltr" />
            </Field>
          </div>
          <Field label="ملاحظة">
            <Input name="notes" placeholder="مثال: تحقق الهدف الأول، نقل الوقف للدخول" />
          </Field>
          <Button type="submit" variant="secondary" disabled={pending || !signals.length}>
            {pending ? "جارٍ التحديث..." : "تحديث"}
          </Button>
          <Result state={state} />
        </form>
      </CardContent>
    </Card>
  );
}

export function NewsForm() {
  const [state, action, pending] = useActionState(createNewsAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>📰 خبر / تحليل</CardTitle>
        <CardDescription>يظهر في صفحة المجتمع مباشرة، ويمكن نشره في القناة أيضاً.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="النوع">
              <Select name="kind" defaultValue="analysis">
                {(["analysis", "news", "announcement"] as const).map((k) => (
                  <option key={k} value={k}>
                    {NEWS_KIND_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="الأصل">
              <Select name="asset_class" defaultValue="">
                <option value="">عام</option>
                {Object.entries(ASSET_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="التأثير">
              <Select name="impact" defaultValue="">
                <option value="">—</option>
                {Object.entries(IMPACT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="العنوان">
            <Input name="title" required minLength={2} maxLength={300} />
          </Field>
          <Field label="النص">
            <Textarea name="body" rows={4} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="publish" defaultChecked className="h-4 w-4 accent-[hsl(var(--primary))]" />
            نشر في قناة تيليجرام أيضاً
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "جارٍ النشر..." : "نشر"}
          </Button>
          <Result state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
