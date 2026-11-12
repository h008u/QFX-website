"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { SITE_THEMES } from "@/config/themes";
import { PREVIEW_KEY } from "@/lib/theme-script";

/** شريط صغير يظهر أثناء معاينة ثيم من لوحة التحكم (?theme=...) */
export function ThemePreviewBar() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    try {
      const id = sessionStorage.getItem(PREVIEW_KEY);
      setName(SITE_THEMES.find((t) => t.id === id)?.name ?? null);
    } catch {
      /* التخزين غير متاح */
    }
  }, []);
  if (!name) return null;
  const exit = () => {
    try {
      sessionStorage.removeItem(PREVIEW_KEY);
    } catch {
      /* التخزين غير متاح */
    }
    location.href = location.pathname + "?theme=reset";
  };
  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[60] mx-auto flex w-fit items-center gap-3 rounded-pill bg-foreground px-4 py-2 text-sm text-background shadow-2xl md:bottom-6">
      معاينة ثيم: <b>{name}</b>
      <button onClick={exit} className="flex items-center gap-1 rounded-pill bg-background/15 px-2.5 py-1 text-xs font-semibold hover:bg-background/25">
        <X className="h-3.5 w-3.5" /> إنهاء المعاينة
      </button>
    </div>
  );
}
