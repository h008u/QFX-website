"use client";

import { useState } from "react";
import { updateLeadAction } from "@/app/admin/_actions/crm";
import { cn } from "@/lib/utils";
import { useAction } from "./ui";

export const LEAD_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "جديد", tone: "bg-primary/15 text-primary" },
  contacted: { label: "تم التواصل", tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  registered: { label: "سجّل حساباً", tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  verified: { label: "مرتبط بالوكالة", tone: "bg-gold/15 text-gold" },
  funded: { label: "أودع ✅", tone: "bg-success/15 text-success" },
  rejected: { label: "مرفوض", tone: "bg-muted text-muted-foreground" },
};

export interface LeadRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  telegram_username: string | null;
  broker_account_id: string | null;
  status: string;
  referral_source: string | null;
  notes: string | null;
  createdLabel: string;
}

function Row({ l, canEdit }: { l: LeadRow; canEdit: boolean }) {
  const save = useAction(updateLeadAction);
  const [status, setStatus] = useState(l.status);
  const [notes, setNotes] = useState(l.notes ?? "");
  return (
    <tr className="border-t border-border/60 align-top [&>td]:px-3 [&>td]:py-2.5">
      <td className="num text-xs text-muted-foreground">{l.createdLabel}</td>
      <td className="font-semibold">{l.full_name}</td>
      <td className="num text-xs leading-6">
        {l.telegram_username && (
          <a href={`https://t.me/${l.telegram_username}`} target="_blank" rel="noopener" className="block text-primary hover:underline">@{l.telegram_username}</a>
        )}
        {l.phone && <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="block hover:underline">{l.phone}</a>}
        {l.email && <a href={`mailto:${l.email}`} className="block hover:underline">{l.email}</a>}
      </td>
      <td className="num">{l.broker_account_id ?? "—"}</td>
      <td className="num text-xs">{l.referral_source ?? "—"}</td>
      <td>
        <select
          value={status}
          disabled={!canEdit || save.pending}
          onChange={(e) => {
            setStatus(e.target.value);
            save.run(l.id, { status: e.target.value });
          }}
          className={cn("h-8 rounded-md border-0 px-2 text-xs font-semibold", LEAD_STATUS[status]?.tone)}
        >
          {Object.entries(LEAD_STATUS).map(([k, v]) => (
            <option key={k} value={k} className="bg-card text-foreground">{v.label}</option>
          ))}
        </select>
      </td>
      <td>
        <input
          value={notes}
          disabled={!canEdit}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (l.notes ?? "") && save.run(l.id, { notes })}
          placeholder="ملاحظة..."
          className="h-8 w-44 rounded-md border border-input bg-background px-2 text-xs"
        />
        {save.result && !save.result.ok && <p className="mt-1 text-[11px] text-destructive">{save.result.message}</p>}
      </td>
    </tr>
  );
}

export function LeadsTable({ leads, canEdit }: { leads: LeadRow[]; canEdit: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-start [&>th]:font-medium">
            <th>التاريخ</th><th>الاسم</th><th>التواصل</th><th>رقم الحساب</th><th>المصدر/الإحالة</th><th>الحالة</th><th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <Row key={l.id} l={l} canEdit={canEdit} />
          ))}
          {!leads.length && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">لا طلبات</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
