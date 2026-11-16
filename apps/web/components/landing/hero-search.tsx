"use client";

import { Search } from "lucide-react";
import { EditableText, useSiteContent } from "@/components/site-editor/editor";
import { openSymbolSearch } from "@/components/symbol-search";

export function HeroSearch() {
  const { editing } = useSiteContent();
  return (
    <button
      onClick={() => !editing && openSymbolSearch()}
      className="flex h-12 w-full max-w-xl items-center gap-3 glass-card rounded-pill bg-card px-5 text-start text-base text-muted-foreground shadow-xl ring-1 ring-border transition-transform hover:scale-[1.01] md:h-14 md:px-6 md:text-[17px]"
    >
      <Search className="h-5 w-5 shrink-0 text-foreground" />
      {/* على الجوال نص قصير بسطر واحد؛ النص الكامل (القابل للتعديل) من الشاشات المتوسطة أو في وضع التعديل */}
      {!editing && <span className="truncate sm:hidden">ابحث عن سوق... الذهب، EURUSD</span>}
      <span className={editing ? "min-w-0 truncate" : "hidden min-w-0 truncate sm:inline"}>
        <EditableText k="hero.search" />
      </span>
    </button>
  );
}
