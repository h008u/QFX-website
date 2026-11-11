"use client";

import { Moon, Sun } from "lucide-react";
import { setTheme, useIsDark } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useIsDark();
  return (
    <button
      type="button"
      onClick={() => setTheme(!dark)}
      aria-label={dark ? "الوضع الفاتح" : "الوضع الداكن"}
      title={dark ? "الوضع الفاتح" : "الوضع الداكن"}
      className={cn("rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground", className)}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
