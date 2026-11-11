"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "./supabase/client";

type Row = { id: string; created_at: string };

/**
 * يحتفظ بقائمة صفوف ويحدّثها فورياً عبر Supabase Realtime (إضافة/تعديل/حذف).
 * يعيد أيضاً حالة الاتصال لعرض مؤشر "مباشر".
 */
export function useRealtimeTable<T extends Row>(table: "signals" | "news", initial: T[], limit = 100) {
  const [rows, setRows] = useState<T[]>(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const sb = getBrowserClient();
    if (!sb) return;
    const channel = sb
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        setRows((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((r) => r.id !== (payload.old as Row).id);
          const row = payload.new as T;
          const without = prev.filter((r) => r.id !== row.id);
          return [row, ...without]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);
        });
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      sb.removeChannel(channel);
    };
  }, [table, limit]);

  return { rows, live };
}
