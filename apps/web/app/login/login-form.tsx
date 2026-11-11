"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { ok: false, message: "" });

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <MailCheck className="h-12 w-12 text-primary" />
        <p className="leading-7">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" name="email" type="email" required dir="ltr" autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="full_name">الاسم (للأعضاء الجدد — يظهر في التعليقات)</Label>
        <Input id="full_name" name="full_name" autoComplete="name" />
      </div>
      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "جارٍ الإرسال..." : "أرسل رابط الدخول"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">بدون كلمة مرور — نرسل لك رابطاً آمناً صالحاً لمرة واحدة.</p>
    </form>
  );
}
