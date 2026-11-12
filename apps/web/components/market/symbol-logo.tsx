import { cn } from "@/lib/utils";

// شعارات دائرية للرموز (تصميم خاص بنا): عملة واحدة = دائرة، زوج عملات = دائرتان متداخلتان
const CUR: Record<string, { bg: string; fg?: string; t: string }> = {
  USD: { bg: "#1F6F43", t: "$" },
  EUR: { bg: "#1E40AF", t: "€" },
  GBP: { bg: "#9F1239", t: "£" },
  JPY: { bg: "#DC2626", t: "¥" },
  CHF: { bg: "#E11D48", t: "₣" },
  AUD: { bg: "#0E7490", t: "A$" },
  CAD: { bg: "#B91C1C", t: "C$" },
  NZD: { bg: "#334155", t: "N$" },
  XAU: { bg: "#E2B33C", fg: "#5C4300", t: "Au" },
  XAG: { bg: "#B8BEC8", fg: "#2B3036", t: "Ag" },
  BTC: { bg: "#F7931A", t: "₿" },
  ETH: { bg: "#627EEA", t: "Ξ" },
  WTI: { bg: "#18181B", t: "🛢" },
};

function Circle({ code, size, className, shift = 0 }: { code: string; size: number; className?: string; shift?: number }) {
  const c = CUR[code] ?? { bg: "#787B86", t: code.slice(0, 2) };
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-background", className)}
      style={{ width: size, height: size, background: c.bg, color: c.fg ?? "#fff", fontSize: size * (c.t.length > 1 ? 0.36 : 0.48), lineHeight: 1 }}
      aria-hidden
    >
      <span style={shift ? { transform: `translate(${-shift}px, ${-shift}px)`, fontSize: "0.85em" } : undefined}>{c.t}</span>
    </span>
  );
}

// أسماء بديلة شائعة عند الوسطاء
const ALIAS: Record<string, string> = { USOIL: "WTI", XTIUSD: "WTI", WTIUSD: "WTI", UKOIL: "WTI", XBRUSD: "WTI", GOLD: "XAUUSD", SILVER: "XAGUSD" };

export function SymbolLogo({ symbol, size = 32, className }: { symbol: string; size?: number; className?: string }) {
  const up = symbol.toUpperCase();
  const s = ALIAS[up] ?? up;
  if (s === "WTI" || s.length !== 6) return <Circle code={s === "WTI" ? "WTI" : s.slice(0, 3)} size={size} className={className} />;
  const a = s.slice(0, 3);
  const b = s.slice(3);
  // المعادن والكريبتو مقابل الدولار تُعرض بدائرة واحدة (مثل المنصات الكبيرة)
  if (["XAU", "XAG", "BTC", "ETH"].includes(a)) return <Circle code={a} size={size} className={className} />;
  const small = Math.round(size * 0.72);
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }} dir="ltr" aria-hidden>
      <Circle code={a} size={small} className="absolute left-0 top-0" shift={size * 0.15} />
      <Circle code={b} size={small} className="absolute bottom-0 right-0" />
    </span>
  );
}
