// قائمة مصادر الأخبار المدمجة (الاسم والحالة الافتراضية) — البوت يضيف الرابط وطريقة الجلب
export const NEWS_SOURCE_META = [
  { id: "inv_fx", label: "Investing عربي — العملات", on: true, url: "https://sa.investing.com/rss/news_1.rss" },
  { id: "inv_eco", label: "Investing عربي — الاقتصاد", on: true, url: "https://sa.investing.com/rss/news_14.rss" },
  { id: "inv_cmd", label: "Investing عربي — السلع", on: false, url: "https://sa.investing.com/rss/news_11.rss" },
  { id: "tv_news", label: "TradingView News", on: true, note: "واجهة غير رسمية وقد تتغير" },
  { id: "fxstreet", label: "FXStreet", on: false, url: "https://www.fxstreet.com/rss/news", note: "قد يحجبه Cloudflare" },
  { id: "forexlive", label: "ForexLive", on: false, url: "https://www.forexlive.com/feed/news" },
  { id: "cnbc", label: "CNBC — الاقتصاد", on: false, url: "https://www.cnbc.com/id/20910258/device/rss/rss.html" },
  { id: "oilprice", label: "OilPrice.com — النفط", on: false, url: "https://oilprice.com/rss/main" },
] as const;
