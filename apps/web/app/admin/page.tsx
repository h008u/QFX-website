import { CLOSED_STATUSES } from "@qfx/shared";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSignals } from "@/lib/data";
import { getServiceClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { updateLeadStatusAction } from "./actions";
import { NewSignalForm, NewsForm, UpdateSignalForm } from "./forms";

export const metadata: Metadata = { title: "لوحة التحكم", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LEAD_STATUS: Record<string, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  registered: "سجّل حساباً",
  verified: "تم التحقق",
  funded: "أودع",
  rejected: "مرفوض",
};

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  telegram_username: string | null;
  broker_account_id: string | null;
  status: string;
  referral_source: string | null;
  created_at: string;
}

async function getLeads(): Promise<Lead[] | null> {
  const sb = getServiceClient();
  if (!sb) return null;
  const { data, error } = await sb.from("leads").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) {
    console.error("[admin] leads", error.message);
    return [];
  }
  return data as Lead[];
}

export default async function AdminPage() {
  const [{ data: signals }, leads] = await Promise.all([getSignals(100), getLeads()]);
  const active = signals.filter((s) => !CLOSED_STATUSES.includes(s.status));

  return (
    <div className="container space-y-8 py-12">
      <div>
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <p className="mt-1 text-muted-foreground">إرسال التوصيات والأخبار بضغطة زر، ومتابعة العملاء المحتملين.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <NewSignalForm />
        <div className="space-y-6">
          <UpdateSignalForm signals={active} />
          <NewsForm />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>👥 العملاء المحتملون (CRM)</CardTitle>
          <CardDescription>
            طلبات الانضمام من الموقع. تحقق من ارتباط رقم الحساب بوكالتك في بوابة الوسيط ثم حدّث الحالة.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {leads === null ? (
            <p className="text-sm text-gold">أضف SUPABASE_SERVICE_ROLE_KEY في إعدادات الموقع لعرض العملاء.</p>
          ) : (
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-start [&>th]:font-medium">
                  <th>التاريخ</th>
                  <th>الاسم</th>
                  <th>التواصل</th>
                  <th>رقم الحساب</th>
                  <th>المصدر</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0 [&>td]:px-3 [&>td]:py-2">
                    <td className="text-muted-foreground">{formatDateTime(l.created_at)}</td>
                    <td className="font-semibold">{l.full_name}</td>
                    <td className="num text-xs leading-6">
                      {l.telegram_username && <div>@{l.telegram_username}</div>}
                      {l.phone && <div>{l.phone}</div>}
                      {l.email && <div>{l.email}</div>}
                    </td>
                    <td className="num">{l.broker_account_id ?? "—"}</td>
                    <td>
                      <Badge variant="outline">{l.referral_source ?? "—"}</Badge>
                    </td>
                    <td>
                      <form action={updateLeadStatusAction} className="flex gap-2">
                        <input type="hidden" name="id" value={l.id} />
                        <select
                          name="status"
                          defaultValue={l.status}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {Object.entries(LEAD_STATUS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-md bg-secondary px-2 text-xs hover:bg-secondary/70">حفظ</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {!leads.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      لا توجد طلبات بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
