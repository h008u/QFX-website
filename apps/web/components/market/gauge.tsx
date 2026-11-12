import { cn } from "@/lib/utils";

export type RatingKey = "strong_sell" | "sell" | "neutral" | "buy" | "strong_buy";
export const RATING_LABEL: Record<RatingKey, string> = {
  strong_sell: "بيع قوي",
  sell: "بيع",
  neutral: "محايد",
  buy: "شراء",
  strong_buy: "شراء قوي",
};
export const ratingTone = (r: RatingKey) => (r.includes("buy") ? "text-primary" : r.includes("sell") ? "text-down" : "text-muted-foreground");

/** مقياس نصف دائري (عدّاد) لقيمة من -1 (بيع قوي) إلى +1 (شراء قوي) */
export function Gauge({ value, rating, title, counts, size = 220 }: { value: number; rating: RatingKey; title: string; counts?: { sell: number; neutral: number; buy: number }; size?: number }) {
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`;
  };
  // 5 مقاطع من اليسار (بيع قوي) لليمين (شراء قوي) — مثل عدّادات المنصات
  const segs = [0, 1, 2, 3, 4].map((i) => [Math.PI - (i * Math.PI) / 5 - 0.02, Math.PI - ((i + 1) * Math.PI) / 5 + 0.02]);
  const angle = Math.PI / 2 - (Math.max(-1, Math.min(1, value)) * Math.PI) / 2;
  const nx = cx + (r - 18) * Math.cos(angle);
  const ny = cy - (r - 18) * Math.sin(angle);
  const active = ["strong_sell", "sell", "neutral", "buy", "strong_buy"].indexOf(rating);
  return (
    <div className="flex flex-col items-center">
      <p className="mb-1 text-sm font-semibold">{title}</p>
      <svg width={size} height={size / 2 + 22} viewBox={`0 0 ${size} ${size / 2 + 22}`} style={{ direction: "ltr" }} aria-label={`${title}: ${RATING_LABEL[rating]}`}>
        {segs.map(([a0, a1], i) => (
          <path key={i} d={arc(a0, a1)} fill="none" strokeWidth="7" strokeLinecap="round" stroke={i === active ? (i < 2 ? "var(--chart-down)" : i > 2 ? "var(--chart-accent)" : "hsl(var(--muted-foreground))") : "hsl(var(--border))"} />
        ))}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="hsl(var(--foreground))" />
      </svg>
      <p className={cn("-mt-1 text-lg font-bold", ratingTone(rating))}>{RATING_LABEL[rating]}</p>
      {counts && (
        <div className="mt-2 flex gap-5 text-center text-xs text-muted-foreground">
          <span>بيع<br /><b className="num text-sm text-down">{counts.sell}</b></span>
          <span>محايد<br /><b className="num text-sm text-foreground">{counts.neutral}</b></span>
          <span>شراء<br /><b className="num text-sm text-primary">{counts.buy}</b></span>
        </div>
      )}
    </div>
  );
}
