"use client";

import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { submitLead, type LeadState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function LeadForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, { ok: false, message: "" });

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <p className="font-semibold">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="ref" value={params.get("ref") ?? ""} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="sm:col-span-2">
        <Label htmlFor="full_name">الاسم الكامل *</Label>
        <Input id="full_name" name="full_name" required minLength={2} />
      </div>
      <div>
        <Label htmlFor="telegram">معرّف تيليجرام</Label>
        <Input id="telegram" name="telegram" placeholder="@username" dir="ltr" />
      </div>
      <div>
        <Label htmlFor="phone">رقم الهاتف / واتساب</Label>
        <Input id="phone" name="phone" type="tel" dir="ltr" />
      </div>
      <div>
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" name="email" type="email" dir="ltr" />
      </div>
      <div>
        <Label htmlFor="broker_account_id">رقم حساب التداول (إن وُجد)</Label>
        <Input id="broker_account_id" name="broker_account_id" dir="ltr" />
      </div>
      {state.message && <p className="text-sm text-destructive sm:col-span-2">{state.message}</p>}
      <Button type="submit" size="lg" disabled={pending} className="sm:col-span-2">
        {pending ? "جارٍ الإرسال..." : "أرسل طلب الانضمام"}
      </Button>
    </form>
  );
}
