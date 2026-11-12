"use client";

import { Search } from "lucide-react";
import { openSymbolSearch } from "@/components/symbol-search";

export function HeroSearch() {
  return (
    <button
      onClick={openSymbolSearch}
      className="flex h-14 w-full max-w-xl items-center gap-3 rounded-full bg-white px-6 text-start text-[17px] text-[#787B86] shadow-xl transition-transform hover:scale-[1.01]"
    >
      <Search className="h-5 w-5 text-[#131722]" />
      ابحث عن سوق — الذهب، EURUSD، بيتكوين...
    </button>
  );
}
