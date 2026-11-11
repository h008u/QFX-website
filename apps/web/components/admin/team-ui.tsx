"use client";

import { useActionState } from "react";
import { addByEmailAction, setRoleAction } from "@/app/admin/_actions/team";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ActionMessage, useAction } from "./ui";

const ROLE_OPTIONS = [
  ["admin", "مدير — كل شيء"],
  ["editor", "محرر — ينشر ويوافق ويعدّل المحتوى"],
  ["viewer", "مشاهد — يشاهد فقط"],
  ["member", "عضو عادي (إزالة من الفريق)"],
];

export function RoleSelect({ id, role, self }: { id: string; role: string; self: boolean }) {
  const a = useAction(setRoleAction);
  return (
    <div>
      <select defaultValue={role} disabled={a.pending} onChange={(e) => a.run(id, e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
        {ROLE_OPTIONS.map(([k, l]) => (
          <option key={k} value={k}>{l}{self && k === role ? " (أنت)" : ""}</option>
        ))}
      </select>
      <ActionMessage result={a.result} className="mt-1 text-[11px]" />
    </div>
  );
}

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addByEmailAction, { ok: false, message: "" });
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Input name="email" type="email" placeholder="email@example.com" dir="ltr" className="w-64" required />
      <Select name="role" defaultValue="editor" className="w-auto">
        <option value="editor">محرر</option>
        <option value="viewer">مشاهد</option>
        <option value="admin">مدير</option>
      </Select>
      <Button type="submit" disabled={pending}>إضافة للفريق</Button>
      <ActionMessage result={state} />
    </form>
  );
}
