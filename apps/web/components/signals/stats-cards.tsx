import type { SignalStats } from "@qfx/shared";
import { cn } from "@/lib/utils";

/** إحصائيات مسطّحة بأسلوب "Key stats": تسمية رمادية ورقم كبير، بلا بطاقات */
export function StatsCards({ stats }: { stats: SignalStats }) {
  const items = [
    { label: "نسبة النجاح", value: stats.win_rate === null ? "—" : `${stats.win_rate}%`, tone: "" },
    { label: "صفقات رابحة", value: `${stats.wins} / ${stats.wins + stats.losses}`, tone: "" },
    {
      label: "مجموع النقاط",
      value: `${stats.total_pips > 0 ? "+" : ""}${stats.total_pips}`,
      tone: stats.total_pips >= 0 ? "text-up" : "text-down",
    },
    { label: "صفقات مفتوحة", value: String(stats.open), tone: "" },
  ];
  return (
    <div className="grid grid-cols-2 gap-x-8 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="border-b border-border py-4">
          <p className="text-[13px] text-muted-foreground">{item.label}</p>
          <p className={cn("num mt-1 text-start text-[26px] font-bold md:text-[30px]", item.tone)} style={{ textAlign: "right" }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
