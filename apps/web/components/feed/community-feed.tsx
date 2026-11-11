"use client";

import {
  ASSET_LABEL,
  CURRENCY_LABEL,
  IMPACT_ICON,
  IMPACT_LABEL,
  NEWS_KIND_LABEL,
  type AssetClass,
  type NewsItem,
} from "@qfx/shared";
import { BarChart3, CalendarClock, Megaphone, Newspaper } from "lucide-react";
import { useMemo, useState } from "react";
import { LiveIndicator } from "@/components/live-indicator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useRealtimeTable } from "@/lib/use-realtime";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";

const FILTERS: { key: "all" | "calendar" | AssetClass; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "forex", label: ASSET_LABEL.forex },
  { key: "gold", label: ASSET_LABEL.gold },
  { key: "oil", label: ASSET_LABEL.oil },
  { key: "indices", label: ASSET_LABEL.indices },
  { key: "calendar", label: "المفكرة الاقتصادية" },
];

const KIND_ICON = { news: Newspaper, analysis: BarChart3, calendar: CalendarClock, announcement: Megaphone };

function Post({ item }: { item: NewsItem }) {
  const Icon = KIND_ICON[item.kind];
  return (
    <Card className="animate-fade-in p-4">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{item.source ?? "QFX"}</span>
            <span>•</span>
            <time dateTime={item.created_at} title={formatDateTime(item.created_at)}>
              {timeAgo(item.created_at)}
            </time>
          </div>
          <h3 className="mt-1 font-bold leading-7">{item.title}</h3>
          {item.body && <p className="mt-1 whitespace-pre-line text-sm leading-7 text-muted-foreground">{item.body}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="info">{NEWS_KIND_LABEL[item.kind]}</Badge>
            {item.asset_class && <Badge>{ASSET_LABEL[item.asset_class]}</Badge>}
            {item.currency && <Badge variant="outline">{CURRENCY_LABEL[item.currency] ?? item.currency}</Badge>}
            {item.impact && (
              <Badge variant={item.impact === "high" ? "danger" : "gold"}>
                {IMPACT_ICON[item.impact]} {IMPACT_LABEL[item.impact]}
              </Badge>
            )}
            {item.event_time && <Badge variant="outline">موعد الخبر: {formatDateTime(item.event_time)}</Badge>}
          </div>
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener nofollow"
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              المصدر
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

export function CommunityFeed({ initial, demo }: { initial: NewsItem[]; demo: boolean }) {
  const { rows, live } = useRealtimeTable("news", initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const items = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "calendar") return rows.filter((r) => r.kind === "calendar");
    return rows.filter((r) => r.asset_class === filter);
  }, [rows, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                filter === f.key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <LiveIndicator live={live} demo={demo} />
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <Post key={item.id} item={item} />
        ))}
        {!items.length && <Card className="p-10 text-center text-muted-foreground">لا توجد منشورات في هذا القسم بعد.</Card>}
      </div>
    </div>
  );
}
