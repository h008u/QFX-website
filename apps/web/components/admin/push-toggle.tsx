"use client";

import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { savePushSubscriptionAction, testPushAction } from "@/app/admin/_actions/push";
import { emitToast } from "./toaster";

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** "فعّل الإشعارات على هذا الجهاز" داخل قائمة الجرس */
export function PushToggle() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [state, setState] = useState<"unsupported" | "off" | "on" | "denied">("off");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !key) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, [key]);

  if (state === "unsupported") {
    return <p className="px-4 py-2 text-[11px] text-muted-foreground">إشعارات الجهاز غير متاحة (المتصفح لا يدعمها أو مفاتيح VAPID غير مضبوطة). على آيفون: أضف اللوحة للشاشة الرئيسية أولاً.</p>;
  }

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key!) });
      const r = await savePushSubscriptionAction(sub.toJSON() as never, navigator.userAgent);
      emitToast(r.ok, r.message);
      if (r.ok) setState("on");
    } catch (e) {
      emitToast(false, e instanceof Error ? e.message : "تعذّر التفعيل");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-xs">
      <BellRing className="h-4 w-4 text-primary" />
      {state === "on" ? (
        <>
          <span className="flex-1">الإشعارات مفعّلة على هذا الجهاز</span>
          <button onClick={async () => { const r = await testPushAction(); emitToast(r.ok, r.message); }} className="text-primary hover:underline">تجربة</button>
        </>
      ) : state === "denied" ? (
        <span className="flex-1 text-muted-foreground">رفضت الإشعارات — فعّلها من إعدادات المتصفح</span>
      ) : (
        <button disabled={busy} onClick={enable} className="flex-1 text-start text-primary hover:underline">
          {busy ? "جارٍ التفعيل..." : "فعّل الإشعارات على هذا الجهاز"}
        </button>
      )}
    </div>
  );
}
