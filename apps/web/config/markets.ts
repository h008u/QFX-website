// قائمة الأسواق المعروضة في الموقع (آمنة للمتصفح والخادم)
export type MarketCategory = "forex" | "metals" | "energy" | "crypto";

export interface MarketMeta {
  symbol: string;
  provider: string; // رمز Twelve Data (احتياطي عند ضبط TWELVEDATA_API_KEY)
  yahoo?: string; // رمز Yahoo Finance (مصدر مجاني بلا مفتاح)
  binance?: string; // زوج Binance (للكريبتو — مجاني بلا مفتاح)
  spot?: "XAU" | "XAG"; // سعر فوري من gold-api.com لتصحيح عقود المعادن الآجلة
  name: string; // الاسم العربي
  short: string; // وصف قصير مثل TradingView
  category: MarketCategory;
  base: number; // سعر مرجعي للبيانات التوضيحية فقط
  digits: number;
}

export const CATEGORY_LABEL: Record<MarketCategory, string> = {
  forex: "العملات",
  metals: "المعادن",
  energy: "الطاقة",
  crypto: "الكريبتو",
};

export const MARKETS: MarketMeta[] = [
  { symbol: "XAUUSD", provider: "XAU/USD", yahoo: "GC=F", spot: "XAU", name: "الذهب مقابل الدولار", short: "Gold Spot / U.S. Dollar", category: "metals", base: 3870, digits: 2 },
  { symbol: "XAGUSD", provider: "XAG/USD", yahoo: "SI=F", spot: "XAG", name: "الفضة مقابل الدولار", short: "Silver / U.S. Dollar", category: "metals", base: 47.4, digits: 3 },
  { symbol: "EURUSD", provider: "EUR/USD", yahoo: "EURUSD=X", name: "اليورو مقابل الدولار", short: "Euro / U.S. Dollar", category: "forex", base: 1.10, digits: 5 },
  { symbol: "GBPUSD", provider: "GBP/USD", yahoo: "GBPUSD=X", name: "الإسترليني مقابل الدولار", short: "British Pound / U.S. Dollar", category: "forex", base: 1.27, digits: 5 },
  { symbol: "USDJPY", provider: "USD/JPY", yahoo: "JPY=X", name: "الدولار مقابل الين", short: "U.S. Dollar / Japanese Yen", category: "forex", base: 152, digits: 3 },
  { symbol: "USDCHF", provider: "USD/CHF", yahoo: "CHF=X", name: "الدولار مقابل الفرنك", short: "U.S. Dollar / Swiss Franc", category: "forex", base: 0.88, digits: 5 },
  { symbol: "AUDUSD", provider: "AUD/USD", yahoo: "AUDUSD=X", name: "الأسترالي مقابل الدولار", short: "Australian Dollar / U.S. Dollar", category: "forex", base: 0.66, digits: 5 },
  { symbol: "USDCAD", provider: "USD/CAD", yahoo: "CAD=X", name: "الدولار مقابل الكندي", short: "U.S. Dollar / Canadian Dollar", category: "forex", base: 1.39, digits: 5 },
  { symbol: "WTI", provider: "WTI/USD", yahoo: "CL=F", name: "النفط الخام (WTI)", short: "Crude Oil WTI", category: "energy", base: 71.4, digits: 2 },
  { symbol: "BTCUSD", provider: "BTC/USD", binance: "BTCUSDT", name: "بيتكوين مقابل الدولار", short: "Bitcoin / U.S. Dollar", category: "crypto", base: 64300, digits: 1 },
  { symbol: "ETHUSD", provider: "ETH/USD", binance: "ETHUSDT", name: "إيثريوم مقابل الدولار", short: "Ethereum / U.S. Dollar", category: "crypto", base: 1800, digits: 2 },
];

export const marketOf = (symbol: string) => MARKETS.find((m) => m.symbol === symbol.toUpperCase());

/** رابط صفحة الرمز الثابت (يُفهرس في محركات البحث بدل ?s=) */
export const marketHref = (symbol: string, view?: "chart") => `/markets/${symbol.toLowerCase()}${view ? `?view=${view}` : ""}`;
