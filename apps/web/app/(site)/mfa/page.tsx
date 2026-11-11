import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { MfaChallenge } from "./mfa-challenge";

export const metadata: Metadata = { title: "التحقق بخطوتين", robots: { index: false } };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: raw } = await searchParams;
  const next = raw?.startsWith("/") && !raw.startsWith("//") ? raw : "/admin";
  return (
    <div className="container flex justify-center py-16">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold">التحقق بخطوتين</h1>
        <p className="mb-6 mt-2 text-sm leading-7 text-muted-foreground">اكتب الرمز المكوّن من 6 أرقام من تطبيق المصادقة.</p>
        <MfaChallenge next={next} />
      </Card>
    </div>
  );
}
