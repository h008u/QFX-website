"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { WatchlistMobile, type WatchItem } from "./watchlist";

/** قائمة المراقبة للجوال مع فلاتر الفئات (الكل / العملات / ...) */
export function WatchlistMobileFiltered({ items, categories }: { items: (WatchItem & { category: string })[]; categories: Record<string, string> }) {
  const [cat, setCat] = useState<string>("all");
  const shown = cat === "all" ? items : items.filter((i) => i.category === cat);
  const tabs: [string, string][] = [["all", "الكل"], ...Object.entries(categories)];
  return (
    <>
      {/* الفلاتر تبقى ظاهرة تحت الرأس أثناء التمرير */}
      <div className="scrollbar-none sticky top-16 z-30 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setCat(k)}
            className={cn("h-8 shrink-0 rounded-pill px-4 text-sm font-semibold transition-colors", k === cat ? "bg-foreground text-background" : "bg-secondary")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="border-t border-border">
        <WatchlistMobile items={shown} />
      </div>
    </>
  );
}
