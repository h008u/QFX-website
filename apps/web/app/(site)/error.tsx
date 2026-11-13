"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";
import { Button, buttonVariants } from "@/components/ui/button";

/** خطأ داخل صفحة: يبقى الرأس والتذييل، مع إعادة محاولة وروابط بديلة بدل صفحة بيضاء */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="num text-sm font-semibold text-muted-foreground">{error.digest ? `#${error.digest}` : "خطأ"}</p>
      <h1 className="mt-2 text-3xl font-bold">تعذّر عرض هذه الصفحة</h1>
      <p className="mt-3 max-w-md leading-7 text-muted-foreground">حدث خطأ مؤقت وتم إبلاغ فريقنا تلقائياً. جرّب مرة أخرى، أو انتقل لقسم آخر.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="pill" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> إعادة المحاولة
        </Button>
        <Link href="/" className={buttonVariants({ size: "pill", variant: "outline" })}>الرئيسية</Link>
        <Link href="/markets" className={buttonVariants({ size: "pill", variant: "ghost" })}>الأسواق</Link>
      </div>
    </div>
  );
}
