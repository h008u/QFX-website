"use client";

import { ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrowserClient } from "@/lib/supabase/client";

interface Factor {
  id: string;
  friendly_name?: string;
  status: string;
}

/** التحقق بخطوتين بتطبيق مصادقة (Google Authenticator، Authy...) عبر Supabase MFA */
export function MfaSettings({ required }: { required: boolean }) {
  const sb = getBrowserClient();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await sb!.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  };
  useEffect(() => {
    if (sb) load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sb) return null;
  const verified = factors?.filter((f) => f.status === "verified") ?? [];

  return (
    <div id="mfa" className="space-y-4">
      {required && !verified.length && (
        <p className="rounded-md bg-gold/10 p-3 text-sm text-gold">لوحة الإدارة تتطلب التحقق بخطوتين. فعّله هنا ثم ارجع للوحة.</p>
      )}
      {verified.map((f) => (
        <div key={f.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
          <ShieldCheck className="h-5 w-5 text-success" />
          <span className="flex-1">{f.friendly_name || "تطبيق المصادقة"} — مفعّل</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (!confirm("إلغاء التحقق بخطوتين؟")) return;
              const { error } = await sb.auth.mfa.unenroll({ factorId: f.id });
              setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "أُلغي" });
              load();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {!verified.length && !enroll && (
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            // إزالة أي تسجيل سابق لم يكتمل
            for (const f of factors ?? []) if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
            const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `QFX ${new Date().toISOString().slice(0, 10)}` });
            setBusy(false);
            if (error || !data) return setMsg({ ok: false, text: error?.message ?? "تعذّر البدء" });
            setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
          }}
        >
          <ShieldCheck className="h-4 w-4" /> تفعيل التحقق بخطوتين
        </Button>
      )}

      {enroll && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm">1. امسح الرمز بتطبيق المصادقة (Google Authenticator أو Authy):</p>
          { }
          <img src={enroll.qr} alt="QR" className="h-44 w-44 rounded bg-white p-2" />
          <p className="text-xs text-muted-foreground">
            أو أدخل المفتاح يدوياً: <code className="num select-all" dir="ltr">{enroll.secret}</code>
          </p>
          <p className="text-sm">2. اكتب الرمز المكوّن من 6 أرقام:</p>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" dir="ltr" className="w-36 text-center tracking-widest" />
            <Button
              disabled={busy || code.length !== 6}
              onClick={async () => {
                setBusy(true);
                const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enroll.id, code });
                setBusy(false);
                if (error) return setMsg({ ok: false, text: "الرمز غير صحيح، حاول مرة أخرى" });
                setEnroll(null);
                setCode("");
                setMsg({ ok: true, text: "تم تفعيل التحقق بخطوتين ✅" });
                load();
              }}
            >
              تأكيد
            </Button>
          </div>
        </div>
      )}
      {msg && <p className={msg.ok ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</p>}
    </div>
  );
}
