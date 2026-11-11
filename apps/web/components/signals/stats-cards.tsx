import type { SignalStats } from "@qfx/shared";
import { Activity, Percent, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatsCards({ stats }: { stats: SignalStats }) {
  const items = [
    { label: "نسبة النجاح", value: stats.win_rate === null ? "—" : `${stats.win_rate}%`, icon: Percent, tone: "text-primary" },
    { label: "صفقات رابحة", value: `${stats.wins} / ${stats.wins + stats.losses}`, icon: Target, tone: "text-success" },
    {
      label: "مجموع النقاط",
      value: `${stats.total_pips > 0 ? "+" : ""}${stats.total_pips}`,
      icon: TrendingUp,
      tone: stats.total_pips >= 0 ? "text-success" : "text-destructive",
    },
    { label: "صفقات مفتوحة", value: String(stats.open), icon: Activity, tone: "text-foreground" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {item.label}
            <item.icon className={cn("h-4 w-4", item.tone)} />
          </div>
          <p className={cn("num mt-3 text-end text-2xl font-bold md:text-3xl", item.tone)}>{item.value}</p>
        </Card>
      ))}
    </div>
  );
}
