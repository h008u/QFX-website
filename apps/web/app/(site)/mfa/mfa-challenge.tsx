"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrowserClient } from "@/lib/supabase/client";

export function MfaChallenge({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const sb = getBrowserClient();
        if (!sb) return;
        setBusy(true);
        setErr("");
        const { data } = await sb.auth.mfa.listFactors();
        const factor = data?.totp.find((f) => f.status === "verified");
        if (!factor) {
          setBusy(false);
          return setErr("لا يوجد تطبيق مصادقة مفعّل");
        }
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
        setBusy(false);
        if (error) return setErr("الرمز غير صحيح أو انتهت صلاحيته");
        window.location.href = next;
      }}
    >
      <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoFocus dir="ltr" className="h-12 text-center text-xl tracking-[0.5em]" placeholder="000000" />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6}>
        <ShieldCheck className="h-4 w-4" /> تحقق
      </Button>
    </form>
  );
}
