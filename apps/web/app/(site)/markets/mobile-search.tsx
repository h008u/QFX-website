"use client";

import { Search } from "lucide-react";
import { openSymbolSearch } from "@/components/symbol-search";
import { cn } from "@/lib/utils";

export function MobileSearchButton({ className }: { className?: string }) {
  return (
    <button onClick={openSymbolSearch} className={cn("grid h-10 w-10 place-items-center rounded-full bg-secondary", className)} aria-label="بحث عن رمز">
      <Search className="h-5 w-5" />
    </button>
  );
}
