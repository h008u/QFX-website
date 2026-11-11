import { DIRECTION_LABEL, STATUS_LABEL, type Signal } from "@qfx/shared";
import { Download } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Mt5Section } from "@/components/admin/settings/mt5-section";
import { PageHeader, Section } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings, loadState } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "ربط MT5" };

interface Mt5State {
  hello?: { version?: string; build?: number; at: string };
  account?: { login?: number; server?: string; company?: string; currency?: string; balance?: number; equity?: number; margin?: number; profit?: number; leverage?: number; positions?: { ticket: number; symbol: string; side: string; volume: number; price: number; sl: number; tp: number; current: number; profit: number }[]; at: string };
  last_event?: { type: string; at: string };
  counts?: Record<string, number>;
}

const DEMO: Mt5State = {
  hello: { version: "1.40", build: 4410, at: new Date(Date.now() - 3600_000).toISOString() },
  account: {
    login: 51234567, server: "Broker-Live", company: "شركة الوساطة", currency: "USD", balance: 2500, equity: 2562.4, margin: 132.5, profit: 62.4, leverage: 500,
    positions: [{ ticket: 77, symbol: "XAUUSDm", side: "buy", volume: 0.1, price: 2650, sl: 2650, tp: 2680, current: 2656.24, profit: 62.4 }],
    at: new Date(Date.now() - 50_000).toISOString(),
  },
  last_event: { type: "account", at: new Date(Date.now() - 50_000).toISOString() },
};

export default async function Mt5Page() {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const st = ctx.demo ? DEMO : await loadState<Mt5State>(ctx, "mt5", {});
  const { data: sigs } = await ctx.db.from("signals").select("*").eq("source", "mt5").order("created_at", { ascending: false }).limit(50);
  const trades = (sigs ?? []) as Signal[];
  const pub = process.env.BOT_PUBLIC_URL?.replace(/\/$/, "");
  const secret = process.env.MT5_SECRET;
  const url = pub && secret ? `${pub}/mt5/${secret}` : null;
  const acc = st.account;
  const online = acc?.at && Date.now() - new Date(acc.at).getTime() < 5 * 60_000;
  const closed = trades.filter((t) => t.result_pips !== null);
  const pips = closed.reduce((a, t) => a + Number(t.result_pips), 0);
  const wins = closed.filter((t) => Number(t.result_pips) > 0).length;
  const tz = s.general.timezone;

  return (
    <>
      <PageHeader title="ربط MT5" description="إضافة صغيرة على منصة MT5 بجهازك ترسل صفقاتك للبوت: الصفقة الجديدة تنزل كتوصية، وتعديل الوقف أو الهدف ينزل «تحديث صفقة»، والإغلاق ينزل النتيجة بالنقاط — كلها كرد على منشور الصفقة." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {[
          ["الحالة", online ? "🟢 متصل" : acc ? "🟠 غير متصل" : "⚪ لم يتصل بعد", ""],
          ["الرصيد", acc?.balance !== undefined ? `${acc.balance} ${acc.currency ?? ""}` : "—", ""],
          ["السيولة", acc?.equity !== undefined ? String(acc.equity) : "—", ""],
          ["الربح العائم", acc?.profit !== undefined ? `${Number(acc.profit) > 0 ? "+" : ""}${acc.profit}` : "—", Number(acc?.profit) >= 0 ? "text-success" : "text-destructive"],
          ["صفقات مغلقة", `${wins}/${closed.length}`, ""],
          ["مجموع النقاط", `${pips > 0 ? "+" : ""}${Math.round(pips * 10) / 10}`, pips >= 0 ? "text-success" : "text-destructive"],
        ].map(([l, v, tone]) => (
          <div key={l} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className={cn("num mt-2 text-lg font-bold", tone)}>{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="🧩 التركيب (مرة واحدة)">
          <ol className="list-decimal space-y-2 ps-5 text-sm leading-7">
            <li>
              نزّل الإضافة:{" "}
              <a href="/downloads/QFXBridge.mq5" download className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Download className="h-4 w-4" /> QFXBridge.mq5
              </a>
            </li>
            <li>في MT5: File ← Open Data Folder ← MQL5 ← Experts، والصق الملف. افتحه بـ MetaEditor واضغط Compile (F7).</li>
            <li>Tools ← Options ← Expert Advisors: فعّل <b>Allow WebRequest</b> وأضف رابط خدمة البوت (بدون المسار).</li>
            <li>اسحب QFXBridge على أي شارت، والصق الرابط التالي في خانة <b>PanelUrl</b>:</li>
          </ol>
          <div className="mt-3 flex items-center gap-2">
            <code className="num min-w-0 flex-1 truncate rounded-md border border-border bg-background px-3 py-2 text-xs" dir="ltr">
              {ctx.role === "admin" ? url ?? "اضبط BOT_PUBLIC_URL و MT5_SECRET في الموقع والبوت" : "يظهر للمدير فقط"}
            </code>
            {url && ctx.role === "admin" && <CopyButton value={url} />}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">الرابط سري: من يملكه يستطيع النشر في قناتك. لتغييره غيّر MT5_SECRET في البوت والموقع.</p>
        </Section>
        <Mt5Section initial={s.mt5} canEdit={canEdit(ctx.role)} />
      </div>

      {acc && (
        <div className="mb-6">
          <Section title={`الحساب ${acc.login ?? ""} — ${acc.company ?? ""} (${acc.server ?? ""})`} description={`آخر تحديث: ${fmtDateTime(acc.at, tz)} • الرافعة 1:${acc.leverage ?? "?"} • إصدار الإضافة ${st.hello?.version ?? "?"}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-start [&>th]:font-medium">
                    <th>التذكرة</th><th>الرمز</th><th>الاتجاه</th><th>الحجم</th><th>الدخول</th><th>الوقف</th><th>الهدف</th><th>الحالي</th><th>الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {(acc.positions ?? []).map((p) => (
                    <tr key={p.ticket} className="num border-t border-border/60 [&>td]:px-3 [&>td]:py-2">
                      <td>{p.ticket}</td><td className="font-semibold">{p.symbol}</td>
                      <td className={p.side === "buy" ? "text-success" : "text-destructive"}>{p.side === "buy" ? "شراء" : "بيع"}</td>
                      <td>{p.volume}</td><td>{p.price}</td><td>{p.sl || "—"}</td><td>{p.tp || "—"}</td><td>{p.current}</td>
                      <td className={p.profit >= 0 ? "text-success" : "text-destructive"}>{p.profit > 0 ? "+" : ""}{p.profit}</td>
                    </tr>
                  ))}
                  {!acc.positions?.length && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">لا صفقات مفتوحة</td></tr>}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      <Section title="صفقات MT5 المنشورة">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-start [&>th]:font-medium"><th>التاريخ</th><th>الرمز</th><th>الاتجاه</th><th>الدخول</th><th>الحالة</th><th>النقاط</th></tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-t border-border/60 [&>td]:px-3 [&>td]:py-2">
                  <td className="num text-xs text-muted-foreground">{fmtDateTime(t.created_at, tz)}</td>
                  <td className="num font-semibold">{t.symbol}</td>
                  <td className={t.direction === "BUY" ? "text-success" : "text-destructive"}>{DIRECTION_LABEL[t.direction]}</td>
                  <td className="num">{Number(t.entry_price)}</td>
                  <td className="text-xs">{STATUS_LABEL[t.status]}</td>
                  <td className={cn("num font-bold", t.result_pips === null ? "text-muted-foreground" : Number(t.result_pips) >= 0 ? "text-success" : "text-destructive")}>{t.result_pips ?? "—"}</td>
                </tr>
              ))}
              {!trades.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لم تصل صفقات بعد</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
