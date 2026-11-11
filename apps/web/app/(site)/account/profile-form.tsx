"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateProfile, type ProfileState } from "./actions";

export function ProfileForm({ fullName, telegram }: { fullName: string; telegram: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, { ok: false, message: "" });
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="full_name">الاسم (يظهر في التعليقات)</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} maxLength={120} />
      </div>
      <div>
        <Label htmlFor="telegram_username">معرّف تيليجرام</Label>
        <Input id="telegram_username" name="telegram_username" defaultValue={telegram} dir="ltr" placeholder="@username" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
        {state.message && <p className={cn("text-sm", state.ok ? "text-success" : "text-destructive")}>{state.message}</p>}
      </div>
    </form>
  );
}
