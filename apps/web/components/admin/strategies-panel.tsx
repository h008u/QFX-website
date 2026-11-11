"use client";

import {
  SESSIONS, STOP_MODES, STRATEGIES, TF_LABEL, type BacktestResult, type BotSettings, type StrategyConfig, type StrategyId,
} from "@qfx/shared";
import { ChevronDown, FlaskConical } from "lucide-react";
import { useState } from "react";
import { runBacktestAction } from "@/app/admin/_actions/strategies";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EquityChart } from "./equity-chart";
import { Field, inputCls, TestButton, useSection } from "./settings/common";
import { emitToast } from "./toaster";
import { ListInput, Switch } from "./ui";

export interface LiveStats {
  signals: number;
  wins: number;
  losses: number;
  pips: number;
  open: number;
}

const RESULT_LABEL: Record<string, string> = { tp2: "الهدف الثاني", be: "الهدف الأول ثم الدخول", sl: "الوقف", expired: "انتهت" };

function Backtest({ id, symbols, canEdit }: { id: StrategyId; symbols: string[]; canEdit: boolean }) {
  const [symbol, setSymbol] = useState(symbols[0] ?? "XAUUSD");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<(BacktestResult & { demo: boolean }) | null>(null);
  const fmt = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
  return (
    <div className="mt-4 rounded-lg border border-border bg-background/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FlaskConical className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">اختبار على التاريخ</span>
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {[...new Set([...symbols, "XAUUSD", "EURUSD", "GBPUSD", "USDJPY"])].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={busy || !canEdit}
          onClick={async () => {
            setBusy(true);
            const r = await runBacktestAction(id, symbol);
            setBusy(false);
            if (r.ok && r.result) setRes(r.result);
            else emitToast(false, r.message ?? "فشل");
          }}
        >
          {busy ? "يحسب..." : "شغّل الاختبار"}
        </Button>
        <span className="text-[11px] text-muted-foreground">بالإعدادات المحفوظة • إذا لمس الوقف والهدف نفس الشمعة يُحسب وقفاً</span>
      </div>
      {res && (
        <div className="mt-4 space-y-4">
          {res.demo && <p className="text-xs text-gold">بيانات توضيحية — أضف TWELVEDATA_API_KEY في الموقع لاختبار حقيقي.</p>}
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {[
              ["الصفقات", res.trades],
              ["النجاح", res.winRate === null ? "—" : `${res.winRate}%`],
              ["النقاط", `${res.pips > 0 ? "+" : ""}${res.pips}`],
              ["معامل الربح", res.profitFactor ?? "∞"],
              ["أكبر تراجع", `-${res.maxDrawdown}`],
              ["الفترة", res.from && res.to ? `${fmt(res.from)} ← ${fmt(res.to)}` : "—"],
            ].map(([l, v]) => (
              <div key={String(l)} className="rounded-md border border-border bg-card p-2.5">
                <p className="text-[11px] text-muted-foreground">{l}</p>
                <p className="num mt-1 text-sm font-bold">{v}</p>
              </div>
            ))}
          </div>
          {res.curve.length > 1 && <EquityChart points={res.curve.map((c) => ({ time: c.t, value: c.pips }))} />}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead className="text-muted-foreground">
                <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:text-start [&>th]:font-medium"><th>الدخول</th><th>الاتجاه</th><th>السعر</th><th>الخروج</th><th>النتيجة</th><th>النقاط</th></tr>
              </thead>
              <tbody>
                {res.last.map((t, i) => (
                  <tr key={i} className="num border-t border-border/60 [&>td]:px-2 [&>td]:py-1.5">
                    <td>{fmt(t.at)}</td>
                    <td className={t.dir === "buy" ? "text-success" : "text-destructive"}>{t.dir === "buy" ? "شراء" : "بيع"}</td>
                    <td>{t.entry}</td><td>{t.exit}</td><td className="font-sans">{RESULT_LABEL[t.result]}</td>
                    <td className={t.pips >= 0 ? "text-success" : "text-destructive"}>{t.pips > 0 ? "+" : ""}{t.pips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StrategyCard({
  cfg, live, onChange, symbols, canEdit,
}: { cfg: StrategyConfig; live: LiveStats; onChange: (c: StrategyConfig) => void; symbols: string[]; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = STRATEGIES[cfg.id as StrategyId];
  const set = (p: Partial<StrategyConfig>) => onChange({ ...cfg, ...p });
  const rate = live.wins + live.losses ? Math.round((live.wins / (live.wins + live.losses)) * 100) : null;
  return (
    <div className={cn("rounded-lg border bg-card", cfg.enabled ? "border-primary/40" : "border-border")}>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <Switch checked={cfg.enabled} disabled={!canEdit} onChange={(enabled) => set({ enabled })} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{meta.name} <span className="ms-1 rounded bg-secondary px-1.5 text-[11px] font-normal text-muted-foreground">{TF_LABEL[cfg.tf]}</span></p>
          <p className="text-xs leading-5 text-muted-foreground">{meta.desc}</p>
        </div>
        <div className="num flex gap-4 text-xs">
          <span title="إشارات مغلقة">{live.signals} إشارة</span>
          <span className={rate === null ? "text-muted-foreground" : rate >= 50 ? "text-success" : "text-destructive"}>{rate === null ? "—" : `${rate}%`}</span>
          <span className={live.pips >= 0 ? "text-success" : "text-destructive"}>{live.pips > 0 ? "+" : ""}{live.pips}</span>
          {live.open > 0 && <span className="text-primary">{live.open} مفتوحة</span>}
        </div>
        <button onClick={() => setOpen((v) => !v)} className="rounded p-1 hover:bg-secondary" aria-label="الإعدادات" aria-expanded={open}>
          <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <div className="border-t border-border p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="الإطار الزمني">
              <select className={inputCls} value={cfg.tf} disabled={!canEdit} onChange={(e) => set({ tf: e.target.value as StrategyConfig["tf"] })}>
                {Object.entries(TF_LABEL).map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
              </select>
            </Field>
            <Field label="طريقة الوقف">
              <select className={inputCls} value={cfg.stop} disabled={!canEdit} onChange={(e) => set({ stop: e.target.value as StrategyConfig["stop"] })}>
                {Object.entries(STOP_MODES).map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
              </select>
            </Field>
            {cfg.stop === "pips" ? (
              <Field label="الوقف (نقطة)"><input className={inputCls} type="number" value={cfg.fixed_pips} disabled={!canEdit} onChange={(e) => set({ fixed_pips: Number(e.target.value) })} dir="ltr" /></Field>
            ) : (
              <Field label="مضاعف ATR"><input className={inputCls} type="number" step="0.1" value={cfg.atr_mult} disabled={!canEdit} onChange={(e) => set({ atr_mult: Number(e.target.value) })} dir="ltr" /></Field>
            )}
            <Field label="الهدفان (× المخاطرة)">
              <div className="flex gap-1">
                <input className={inputCls} type="number" step="0.1" value={cfg.tp1_r} disabled={!canEdit} onChange={(e) => set({ tp1_r: Number(e.target.value) })} dir="ltr" />
                <input className={inputCls} type="number" step="0.1" value={cfg.tp2_r} disabled={!canEdit} onChange={(e) => set({ tp2_r: Number(e.target.value) })} dir="ltr" />
              </div>
            </Field>
            <Field label="الجلسة">
              <select className={inputCls} value={cfg.session} disabled={!canEdit} onChange={(e) => set({ session: e.target.value as StrategyConfig["session"] })}>
                {Object.entries(SESSIONS).map(([k, [l]]) => (<option key={k} value={k}>{l}</option>))}
              </select>
            </Field>
            <Field label="تأكيد من استراتيجية">
              <select className={inputCls} value={cfg.confirm ?? ""} disabled={!canEdit} onChange={(e) => set({ confirm: e.target.value || null })}>
                <option value="">بدون</option>
                {Object.entries(STRATEGIES).filter(([k]) => k !== cfg.id).map(([k, v]) => (<option key={k} value={k}>{v.name}</option>))}
              </select>
            </Field>
            <Field label="حد أقصى باليوم"><input className={inputCls} type="number" value={cfg.max_per_day} disabled={!canEdit} onChange={(e) => set({ max_per_day: Number(e.target.value) })} dir="ltr" /></Field>
            <Field label="تجنّب الأخبار (دقيقة)" hint="0 = بدون"><input className={inputCls} type="number" value={cfg.avoid_news_min} disabled={!canEdit} onChange={(e) => set({ avoid_news_min: Number(e.target.value) })} dir="ltr" /></Field>
          </div>
          <div className="mt-3">
            <Switch checked={cfg.publish} disabled={!canEdit} onChange={(publish) => set({ publish })} label="نشر الإشارات في القناة" description="عند الإطفاء تُسجّل وتُتابع بصمت (لتقييم الاستراتيجية قبل نشرها)" />
          </div>
          <Backtest id={cfg.id as StrategyId} symbols={symbols} canEdit={canEdit} />
        </div>
      )}
    </div>
  );
}

export function StrategiesPanel({ initial, live, canEdit }: { initial: BotSettings["strategies"]; live: Record<string, LiveStats>; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("strategies", initial);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-[1fr_1fr_auto]">
        <Switch checked={v.enabled} disabled={!canEdit} onChange={(enabled) => set({ ...v, enabled })} label="تشغيل بوتات التحليل" description="الفحص بعد إغلاق كل شمعة، والمتابعة كل بضع دقائق (يحتاج TWELVEDATA_API_KEY في البوت)" />
        <Field label="الرموز (حتى 6)" hint="كل رمز وإطار = طلب واحد عند كل شمعة من حد 800/يوم المجاني">
          <ListInput value={v.symbols} onChange={(symbols) => set({ ...v, symbols })} rows={3} placeholder={"XAUUSD\nEURUSD"} />
        </Field>
        {canEdit && <div className="self-end"><TestButton what="strategies" label="افحص الآن" /></div>}
      </div>
      {v.list.map((cfg, i) => (
        <StrategyCard
          key={cfg.id}
          cfg={cfg}
          live={live[cfg.id] ?? { signals: 0, wins: 0, losses: 0, pips: 0, open: 0 }}
          symbols={v.symbols}
          canEdit={canEdit}
          onChange={(c) => set({ ...v, list: v.list.map((x, j) => (j === i ? c : x)) })}
        />
      ))}
      {bar(canEdit)}
    </div>
  );
}
