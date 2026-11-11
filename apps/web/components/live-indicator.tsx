import { cn } from "@/lib/utils";

export function LiveIndicator({ live, demo }: { live: boolean; demo?: boolean }) {
  if (demo) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
        بيانات تجريبية — اربط Supabase لعرض البيانات الحقيقية
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", live ? "animate-pulse-dot bg-success" : "bg-muted-foreground")} />
      {live ? "تحديث مباشر" : "جارٍ الاتصال..."}
    </span>
  );
}
