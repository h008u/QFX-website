"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { createAlertAction, deleteAlertAction, toggleAlertAction } from "@/app/admin/_actions/alerts";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ActionMessage, Switch, useAction } from "./ui";

export interface AlertRow {
  id: string;
  symbol: string;
  direction: "above" | "below";
  price: number;
  note: string | null;
  repeat: boolean;
  cooldown_min: number;
  active: boolean;
  last_price: number | null;
  checkedLabel: string;
  triggeredLabel: string | null;
  trigger_count: number;
}

export function NewAlertForm() {
  const [state, action, pending] = useActionState(createAlertAction, { ok: false, message: "" });
  return (
    <form action={action} className="grid grid-cols-2 gap-3 md:grid-cols-6 md:items-end">
      <div>
        <Label>الرمز</Label>
        <Input name="symbol" placeholder="XAUUSD" required dir="ltr" />
      </div>
      <div>
        <Label>الشرط</Label>
        <Select name="direction" defaultValue="above">
          <option value="above">📈 صعد فوق</option>
          <option value="below">📉 نزل تحت</option>
        </Select>
      </div>
      <div>
        <Label>السعر</Label>
        <Input name="price" type="number" step="any" required dir="ltr" />
      </div>
      <div className="col-span-2 md:col-span-2">
        <Label>ملاحظة تنزل مع التنبيه</Label>
        <Input name="note" placeholder="مثال: اختراق قمة الأسبوع" />
      </div>
      <div>
        <Label>التهدئة (دقيقة)</Label>
        <Input name="cooldown_min" type="number" defaultValue={60} min={5} dir="ltr" />
      </div>
      <label className="col-span-2 flex items-center gap-2 text-sm md:col-span-3">
        <input type="checkbox" name="repeat" className="h-4 w-4 accent-[hsl(var(--primary))]" />
        متكرر (يُطلق كلما عبر السعر المستوى من جديد بعد فترة التهدئة)
      </label>
      <div className="col-span-2 flex items-center gap-3 md:col-span-3 md:justify-end">
        <ActionMessage result={state} />
        <Button type="submit" disabled={pending}>إضافة تنبيه</Button>
      </div>
    </form>
  );
}

function Row({ a, canEdit }: { a: AlertRow; canEdit: boolean }) {
  const toggle = useAction(toggleAlertAction);
  const del = useAction(deleteAlertAction);
  const dist = a.last_price ? ((Number(a.price) - Number(a.last_price)) / Number(a.last_price)) * 100 : null;
  return (
    <tr className={cn("border-t border-border/60 [&>td]:px-3 [&>td]:py-3", !a.active && "opacity-50")}>
      <td className="num font-semibold">{a.symbol}</td>
      <td className="whitespace-nowrap">
        {a.direction === "above" ? "📈 فوق" : "📉 تحت"} <span className="num font-semibold">{Number(a.price)}</span>
      </td>
      <td className="num">
        {a.last_price ?? "—"}
        {dist !== null && <span className="ms-2 text-[11px] text-muted-foreground">({dist > 0 ? "+" : ""}{dist.toFixed(2)}%)</span>}
      </td>
      <td className="max-w-48 truncate text-xs text-muted-foreground">{a.note ?? "—"}</td>
      <td className="text-xs">{a.repeat ? `متكرر • ${a.cooldown_min}د` : "مرة واحدة"}</td>
      <td className="num text-xs text-muted-foreground">{a.trigger_count ? `${a.trigger_count}× • ${a.triggeredLabel}` : "—"}</td>
      <td className="num text-xs text-muted-foreground">{a.checkedLabel}</td>
      <td>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Switch checked={a.active} onChange={(v) => toggle.run(a.id, v)} disabled={toggle.pending} />
            <Button size="sm" variant="ghost" onClick={() => del.run(a.id)} disabled={del.pending} aria-label="حذف">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

export function AlertsTable({ alerts, canEdit }: { alerts: AlertRow[]; canEdit: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-medium">
            <th>الرمز</th><th>الشرط</th><th>آخر سعر</th><th>الملاحظة</th><th>النوع</th><th>انطلق</th><th>آخر فحص</th><th></th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <Row key={a.id} a={a} canEdit={canEdit} />
          ))}
          {!alerts.length && (
            <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">لا تنبيهات بعد</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
