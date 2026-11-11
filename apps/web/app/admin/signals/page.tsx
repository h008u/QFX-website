import { CLOSED_STATUSES, DIRECTION_LABEL, STATUS_LABEL, type Signal } from "@qfx/shared";
import { EquityChart } from "@/components/admin/equity-chart";
import { NewSignalForm, UpdateSignalForm } from "@/components/admin/signal-forms";
import { PageHeader, Section } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "التوصيات والأداء" };

const isWin = (s: Signal) => s.status === "tp_hit" || (s.status === "closed" && Number(s.result_pips) > 0);
const isLoss = (s: Signal) => s.status === "sl_hit" || (s.status === "closed" && Number(s.result_pips) < 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

export default async function SignalsAdminPage() {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const { data } = await ctx.db.from("signals").select("*").order("created_at", { ascending: false }).limit(1000);
  const all = (data ?? []) as Signal[];
  const open = all.filter((x) => !CLOSED_STATUSES.includes(x.status));
  const closed = all
    .filter((x) => ["tp_hit", "sl_hit", "closed"].includes(x.status) && x.result_pips !== null)
    .sort((a, b) => (a.closed_at ?? a.created_at).localeCompare(b.closed_at ?? b.created_at));

  const wins = closed.filter(isWin);
  const losses = closed.filter(isLoss);
  const grossWin = wins.reduce((a, x) => a + Number(x.result_pips), 0);
  const grossLoss = Math.abs(losses.reduce((a, x) => a + Number(x.result_pips), 0));
  const total = grossWin - grossLoss;
  let cum = 0;
  let peak = 0;
  let maxDd = 0;
  const points = closed.map((x) => {
    cum += Number(x.result_pips);
    peak = Math.max(peak, cum);
    maxDd = Math.max(maxDd, peak - cum);
    return { time: Math.floor(new Date(x.closed_at ?? x.created_at).getTime() / 1000), value: r1(cum) };
  });

  const stats = [
    { label: "نسبة النجاح", value: wins.length + losses.length ? `${Math.round((wins.length / (wins.length + losses.length)) * 100)}%` : "—" },
    { label: "مجموع النقاط", value: `${total > 0 ? "+" : ""}${r1(total)}`, tone: total >= 0 ? "text-success" : "text-destructive" },
    { label: "معامل الربح", value: grossLoss ? r1(grossWin / grossLoss).toString() : wins.length ? "∞" : "—" },
    { label: "متوسط الربح", value: wins.length ? `+${r1(grossWin / wins.length)}` : "—", tone: "text-success" },
    { label: "متوسط الخسارة", value: losses.length ? `-${r1(grossLoss / losses.length)}` : "—", tone: "text-destructive" },
    { label: "أكبر تراجع", value: maxDd ? `-${r1(maxDd)}` : "0", tone: "text-destructive" },
    { label: "مفتوحة", value: String(open.length) },
  ];

  const month = (x: Signal) => (x.closed_at ?? x.created_at).slice(0, 7);
  const months = [...new Set(closed.map(month))].sort().reverse();
  const symbols = [...new Set(closed.map((x) => x.symbol))];
  const symStats = symbols
    .map((sym) => {
      const rows = closed.filter((x) => x.symbol === sym);
      const w = rows.filter(isWin).length;
      const l = rows.filter(isLoss).length;
      return { sym, n: rows.length, rate: w + l ? Math.round((w / (w + l)) * 100) : 0, pips: r1(rows.reduce((a, x) => a + Number(x.result_pips), 0)) };
    })
    .sort((a, b) => b.pips - a.pips);

  return (
    <>
      <PageHeader title="التوصيات والأداء" description="أرسل التوصيات وحدّثها، وتابع الأداء الحقيقي: المنحنى، معامل الربح، النتائج الشهرية وأداء كل أداة." />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {stats.map((x) => (
          <div key={x.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{x.label}</p>
            <p className={cn("num mt-2 text-end text-xl font-bold", x.tone)}>{x.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 xl:col-span-2">
          <p className="mb-2 font-bold">منحنى النقاط التراكمي</p>
          {points.length ? <EquityChart points={points} /> : <p className="py-16 text-center text-sm text-muted-foreground">لا صفقات مغلقة بعد</p>}
        </div>
        <div className="rounded-lg border border-border bg-card">
          <p className="border-b border-border px-4 py-3 font-bold">النتائج الشهرية</p>
          <table className="w-full text-sm">
            <tbody>
              {months.map((m) => {
                const rows = closed.filter((x) => month(x) === m);
                const pips = r1(rows.reduce((a, x) => a + Number(x.result_pips), 0));
                const w = rows.filter(isWin).length;
                return (
                  <tr key={m} className="border-b border-border/60 last:border-0 [&>td]:px-4 [&>td]:py-2">
                    <td className="num">{m}</td>
                    <td className="num text-muted-foreground">{w}/{rows.length}</td>
                    <td className={cn("num text-end font-bold", pips >= 0 ? "text-success" : "text-destructive")}>{pips > 0 ? "+" : ""}{pips}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit(ctx.role) && (
        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <NewSignalForm />
          <UpdateSignalForm signals={open} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="overflow-x-auto rounded-lg border border-border bg-card xl:col-span-2">
          <p className="border-b border-border px-4 py-3 font-bold">كل التوصيات</p>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-start [&>th]:font-medium">
                <th>التاريخ</th><th>الأداة</th><th>الاتجاه</th><th>الدخول</th><th>الحالة</th><th>النقاط</th>
              </tr>
            </thead>
            <tbody>
              {all.slice(0, 50).map((x) => (
                <tr key={x.id} className="border-t border-border/60 [&>td]:px-3 [&>td]:py-2">
                  <td className="num text-xs text-muted-foreground">{fmtDateTime(x.created_at, s.general.timezone)}</td>
                  <td className="num font-semibold">{x.symbol}</td>
                  <td className={x.direction === "BUY" ? "text-success" : "text-destructive"}>{DIRECTION_LABEL[x.direction]}</td>
                  <td className="num">{Number(x.entry_price)}</td>
                  <td className="text-xs">{STATUS_LABEL[x.status]}</td>
                  <td className={cn("num font-bold", x.result_pips === null ? "text-muted-foreground" : Number(x.result_pips) >= 0 ? "text-success" : "text-destructive")}>
                    {x.result_pips === null ? "—" : `${Number(x.result_pips) > 0 ? "+" : ""}${x.result_pips}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Section title="أداء كل أداة">
          <ul className="space-y-2">
            {symStats.map((x) => (
              <li key={x.sym} className="flex items-center gap-3 text-sm">
                <span className="num w-20 font-semibold">{x.sym}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded bg-secondary">
                  <span className="block h-full bg-primary" style={{ width: `${x.rate}%` }} />
                </span>
                <span className="num w-10 text-xs text-muted-foreground">{x.rate}%</span>
                <span className={cn("num w-14 text-end font-bold", x.pips >= 0 ? "text-success" : "text-destructive")}>{x.pips > 0 ? "+" : ""}{x.pips}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
