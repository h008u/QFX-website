import { LogOut, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { MfaSettings } from "@/components/mfa-settings";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "حسابي", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="container py-16">
        <Card className="mx-auto max-w-lg p-8 text-center text-muted-foreground">
          الحسابات غير مفعّلة في الوضع التجريبي — اربط Supabase أولاً.
        </Card>
      </div>
    );
  }

  const supabase = (await getAuthClient())!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, telegram_username, role, referral_code, created_at")
    .eq("id", user.id)
    .single();

  const referralLink = profile?.referral_code ? `${siteConfig.url}/?ref=${profile.referral_code}` : null;

  return (
    <div className="container max-w-3xl space-y-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">حسابي</h1>
          <p className="num mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.role === "admin" && <Badge variant="info">مدير</Badge>}
          <form action={signOut}>
            <Button variant="outline" size="sm">
              <LogOut className="h-4 w-4" /> خروج
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الملف الشخصي</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm fullName={profile?.full_name ?? ""} telegram={profile?.telegram_username ?? ""} />
        </CardContent>
      </Card>

      {profile?.role && profile.role !== "member" && (
        <Card>
          <CardHeader>
            <CardTitle>🔐 التحقق بخطوتين</CardTitle>
            <CardDescription>طبقة حماية إضافية لدخول لوحة الإدارة: بعد رابط البريد يُطلب رمز من تطبيق المصادقة على جوالك.</CardDescription>
          </CardHeader>
          <CardContent>
            <MfaSettings required={process.env.ADMIN_REQUIRE_MFA === "true"} />
          </CardContent>
        </Card>
      )}

      {referralLink && (
        <Card>
          <CardHeader>
            <CardTitle>رابط الإحالة الخاص بك</CardTitle>
            <CardDescription>شارك الرابط مع أصدقائك؛ يُسجَّل كل من ينضم عبره باسمك لدى الوكالة.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <code className="num min-w-0 flex-1 truncate rounded-md border border-border bg-background px-3 py-2 text-sm">
              {referralLink}
            </code>
            <CopyButton value={referralLink} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>حساب التداول</CardTitle>
          <CardDescription>
            افتح حسابك لدى {siteConfig.brokerName} عبر رابط الوكالة، ثم أرسل رقم الحساب للتفعيل وإضافتك لقناة العملاء.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants()}>
            فتح حساب تداول
          </a>
          <Link href="/#join" className={buttonVariants({ variant: "outline" })}>
            إرسال بيانات التفعيل
          </Link>
          <a href={siteConfig.telegramUrl} target="_blank" rel="noopener" className={buttonVariants({ variant: "ghost" })}>
            <Send className="h-4 w-4" /> قناة تيليجرام
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
