"use client";

import { Search } from "lucide-react";
import { EditableText, useSiteContent } from "@/components/site-editor/editor";
import { openSymbolSearch } from "@/components/symbol-search";

export function HeroSearch() {
  const { editing } = useSiteContent();
  return (
    <button
      onClick={() => !editing && openSymbolSearch()}
      className="flex h-14 w-full max-w-xl items-center gap-3 glass-card rounded-pill bg-card px-6 text-start text-[17px] text-muted-foreground shadow-xl ring-1 ring-border transition-transform hover:scale-[1.01]"
    >
      <Search className="h-5 w-5 text-foreground" />
      <EditableText k="hero.search" />
    </button>
  );
}
