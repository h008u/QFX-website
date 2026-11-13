"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/** آخر خط دفاع: خطأ في التخطيط الجذري نفسه — نبلّغ Sentry ونعرض صفحة بسيطة بلا اعتماد على أي مكوّن */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#FAFAF7", color: "#14213D" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>حدث خطأ غير متوقع</h1>
          <p style={{ color: "#6B7280", marginBottom: 20 }}>تم إبلاغ الفريق تلقائياً. حاول مرة أخرى بعد لحظات.</p>
          <button onClick={reset} style={{ background: "#0A1F44", color: "#fff", border: 0, padding: "12px 24px", borderRadius: 4, fontSize: 15, cursor: "pointer" }}>
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
