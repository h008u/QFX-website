"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllowed, useConsent } from "./provider";

/**
 * يحجب أي ويدجت خارجي (TradingView، Myfxbook...) حتى يوافق الزائر على فئة «المحتوى الخارجي»،
 * ويعرض مكانه بطاقة تشرح السبب مع زر سماح بنقرة.
 */
export function ExternalGate({ name, children, height = 320 }: { name: string; children: React.ReactNode; height?: number }) {
  const allowed = useAllowed("external");
  const { consent, save, ready } = useConsent();
  if (allowed) return <>{children}</>;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-center" style={{ minHeight: height }}>
      <ShieldCheck className="h-8 w-8 text-muted-foreground" />
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">
        هذا المحتوى من <b className="text-foreground">{name}</b> وقد يضع كوكيز خاصة به. لن يُحمَّل قبل موافقتك.
      </p>
      <Button size="sm" disabled={!ready} onClick={() => save({ ...consent, external: true })}>
        السماح بالمحتوى الخارجي
      </Button>
    </div>
  );
}
