import { localParts } from "@qfx/shared";
import Link from "next/link";
import { ContentCalendar, type CalItem } from "@/components/admin/content-calendar";
import { PageHeader } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { toLocalInput } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";

export const metadata = { title: "تقويم المحتوى" };

const pad = (n: number) => String(n).padStart(2, "0");
const plain = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").split("\n")[0].slice(0, 60);

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const tz = s.general.timezone;
  const today = localParts(new Date(), tz).date;
  const { m } = await searchParams;
  const [y, mo] = (m && /^\d{4}-\d{2}$/.test(m) ? m : today.slice(0, 7)).split("-").map(Number);

  // شبكة تبدأ من الأحد
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const start = new Date(first.getTime() - first.getUTCDay() * 86400_000);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400_000);
    return { date: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === mo - 1, weekday: d.getUTCDay() };
  });
  const from = new Date(start.getTime() - 86400_000).toISOString();
  const to = new Date(start.getTime() + 43 * 86400_000).toISOString();

  const [{ data: scheduled }, { data: published }, { data: events }] = await Promise.all([
    ctx.db.from("posts").select("id, title, body, scheduled_at").eq("status", "scheduled").gte("scheduled_at", from).lte("scheduled_at", to),
    ctx.db.from("posts").select("id, title, body, kind, published_at").in("status", ["published", "partial"]).in("kind", ["manual", "signal", "weekly"]).gte("published_at", from).lte("published_at", to).limit(300),
    ctx.db.from("news").select("id, title, currency, event_time").eq("kind", "calendar").eq("impact", "high").gte("event_time", from).lte("event_time", to),
  ]);

  const at = (iso: string) => localParts(new Date(iso), tz);
  const items: CalItem[] = [];
  for (const p of scheduled ?? []) {
    const lp = at(p.scheduled_at);
    items.push({ id: p.id, date: lp.date, time: lp.time, label: p.title || plain(p.body), type: "scheduled", local: toLocalInput(p.scheduled_at, tz) });
  }
  for (const p of published ?? []) {
    const lp = at(p.published_at);
    items.push({ id: p.id, date: lp.date, time: lp.time, label: p.title || plain(p.body), type: "published" });
  }
  for (const e of events ?? []) {
    const lp = at(e.event_time);
    items.push({ id: e.id, date: lp.date, time: lp.time, label: `${e.currency} ${e.title}`, type: "event" });
  }
  // المواعيد الثابتة من الإعدادات
  const g = s.greetings;
  for (const d of days) {
    const add = (time: string, label: string) => items.push({ id: `r-${d.date}-${label}`, date: d.date, time, label, type: "recurring" });
    const weekday = d.weekday >= 1 && d.weekday <= 5;
    if (g.morning.enabled && (!g.morning.weekdays_only || weekday)) add(g.morning.time, "☀️ التحية الصباحية");
    if (s.calendar.agenda_enabled && weekday) add(s.calendar.agenda_time, "🗓 أجندة اليوم");
    if (g.open.enabled && d.weekday === g.open.day) add(g.open.time, "🔔 افتتاح الأسواق");
    if (g.close.enabled && d.weekday === g.close.day) add(g.close.time, "🔕 إغلاق الأسواق");
    if (s.weekly.enabled && d.weekday === s.weekly.day) add(s.weekly.time, "📅 ملخص الأسبوع والاستطلاع");
  }

  const shift = (k: number) => {
    const d = new Date(Date.UTC(y, mo - 1 + k, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  };
  const monthLabel = new Intl.DateTimeFormat("ar-u-nu-latn", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);

  return (
    <>
      <PageHeader
        title="تقويم المحتوى"
        description="منشوراتك المجدولة، والمواعيد الثابتة، والأخبار الاقتصادية القوية في شهر واحد. اسحب المنشور المجدول ليوم آخر أو اضغطه لتغيير وقته أو إلغائه."
        actions={<Link href="/admin/compose" className={buttonVariants()}>منشور جديد</Link>}
      />
      <ContentCalendar month={monthLabel} days={days} items={items} today={today} prev={shift(-1)} next={shift(1)} canEdit={canEdit(ctx.role)} />
    </>
  );
}
