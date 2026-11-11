import "server-only";
import { CLOSED_STATUSES, type NewsItem, type Signal, type SignalStats } from "@qfx/shared";
import { demoNews, demoSignals } from "./demo-data";
import { getServerClient } from "./supabase/server";

export interface DataResult<T> {
  data: T;
  demo: boolean;
}

export async function getSignals(limit = 50): Promise<DataResult<Signal[]>> {
  const sb = getServerClient();
  if (!sb) return { data: demoSignals, demo: true };
  const { data, error } = await sb.from("signals").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) {
    console.error("[data] signals", error.message);
    return { data: [], demo: false };
  }
  return { data: (data ?? []) as Signal[], demo: false };
}

export function computeStats(signals: Signal[]): SignalStats {
  const valid = signals.filter((s) => s.status !== "cancelled");
  const isWin = (s: Signal) => s.status === "tp_hit" || (s.status === "closed" && Number(s.result_pips) > 0);
  const isLoss = (s: Signal) => s.status === "sl_hit" || (s.status === "closed" && Number(s.result_pips) < 0);
  const wins = valid.filter(isWin).length;
  const losses = valid.filter(isLoss).length;
  return {
    total: valid.length,
    open: valid.filter((s) => !CLOSED_STATUSES.includes(s.status)).length,
    closed: valid.filter((s) => CLOSED_STATUSES.includes(s.status)).length,
    wins,
    losses,
    win_rate: wins + losses ? Math.round((wins / (wins + losses)) * 1000) / 10 : null,
    total_pips: Math.round(valid.reduce((sum, s) => sum + Number(s.result_pips ?? 0), 0) * 10) / 10,
  };
}

export async function getSignalStats(): Promise<DataResult<SignalStats>> {
  const sb = getServerClient();
  if (!sb) return { data: computeStats(demoSignals), demo: true };
  const { data, error } = await sb.from("signal_stats").select("*").single();
  if (error || !data) {
    console.error("[data] stats", error?.message);
    return { data: computeStats([]), demo: false };
  }
  return {
    data: {
      ...(data as SignalStats),
      win_rate: data.win_rate === null ? null : Number(data.win_rate),
      total_pips: Number(data.total_pips),
    },
    demo: false,
  };
}

export async function getNews(limit = 50): Promise<DataResult<NewsItem[]>> {
  const sb = getServerClient();
  if (!sb) return { data: demoNews, demo: true };
  const { data, error } = await sb.from("news").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) {
    console.error("[data] news", error.message);
    return { data: [], demo: false };
  }
  return { data: (data ?? []) as NewsItem[], demo: false };
}
