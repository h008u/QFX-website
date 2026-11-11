import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getAuthClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "تسجيل الدخول", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next: nextRaw } = await searchParams;
  const next = nextRaw?.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/account";
  const supabase = await getAuthClient();
  const user = (await supabase?.auth.getUser())?.data.user;
  if (user) redirect(next);

  return (
    <div className="container flex justify-center py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">الدخول إلى المجتمع</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          سجّل دخولك للتعليق على التحليلات والتوصيات والحصول على رابط الإحالة الخاص بك.
        </p>
        {error === "link" && (
          <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            انتهت صلاحية الرابط أو استُخدم مسبقاً. اطلب رابطاً جديداً.
          </p>
        )}
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </Card>
    </div>
  );
}
