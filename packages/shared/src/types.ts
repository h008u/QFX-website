/** أنواع البيانات المشتركة بين الموقع والبوت — تطابق جداول Supabase */

export type Direction = "BUY" | "SELL";
export type SignalStatus = "pending" | "open" | "tp_hit" | "sl_hit" | "closed" | "cancelled";
export type AssetClass = "forex" | "gold" | "oil" | "indices" | "crypto";
export type NewsKind = "news" | "analysis" | "calendar" | "announcement";
export type Impact = "low" | "medium" | "high";
export type SignalSource = "admin" | "telegram" | "tradingview" | "mt5" | "strategy";

export interface Signal {
  id: string;
  symbol: string;
  asset_class: AssetClass;
  direction: Direction;
  entry_price: number;
  stop_loss: number | null;
  take_profit_1: number | null;
  take_profit_2: number | null;
  take_profit_3: number | null;
  status: SignalStatus;
  result_pips: number | null;
  notes: string | null;
  source: SignalSource;
  telegram_message_id: number | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  strategy?: string | null;
  external_ref?: string | null;
}

export interface SignalInput {
  symbol: string;
  direction: Direction;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2?: number | null;
  take_profit_3?: number | null;
  notes?: string | null;
  asset_class?: AssetClass;
  status?: SignalStatus;
  source?: SignalSource;
}

export interface SignalUpdateInput {
  status: Exclude<SignalStatus, "pending">;
  exit_price?: number | null;
  result_pips?: number | null;
  notes?: string | null;
}

export interface NewsItem {
  id: string;
  kind: NewsKind;
  asset_class: AssetClass | null;
  title: string;
  body: string | null;
  impact: Impact | null;
  currency: string | null;
  source: string | null;
  source_url: string | null;
  external_id: string | null;
  event_time: string | null;
  published_to_telegram: boolean;
  telegram_message_id: number | null;
  created_at: string;
}

export interface NewsInput {
  kind?: NewsKind;
  title: string;
  body?: string | null;
  asset_class?: AssetClass | null;
  impact?: Impact | null;
  currency?: string | null;
  source?: string | null;
  source_url?: string | null;
  external_id?: string | null;
  event_time?: string | null;
}

export interface SignalStats {
  total: number;
  open: number;
  closed: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  total_pips: number;
}
