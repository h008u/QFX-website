import { cn } from "@/lib/utils";

export const fmtPrice = (v: number, digits: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** نسبة التغيير ملوّنة: نص (موقع) أو شارة ممتلئة (تطبيق الجوال) */
export function Change({ pct, abs, digits = 2, chip, className }: { pct: number; abs?: number; digits?: number; chip?: boolean; className?: string }) {
  const up = pct >= 0;
  const text = `${up ? "+" : ""}${pct.toFixed(2)}%`;
  if (chip) return <span className={cn("num inline-block min-w-[68px] text-center text-[13px] font-semibold", up ? "chip-up" : "chip-down", className)}>{text}</span>;
  return (
    <span className={cn("num font-medium", up ? "text-up" : "text-down", className)}>
      {abs !== undefined && `${up ? "+" : ""}${fmtPrice(abs, digits)} `}
      {abs !== undefined ? `(${text})` : text}
    </span>
  );
}
