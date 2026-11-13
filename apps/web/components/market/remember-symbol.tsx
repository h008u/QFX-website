"use client";

import { useEffect } from "react";

export const LAST_SYMBOL_KEY = "qfx-last-symbol";

/** يحفظ آخر رمز شاهده الزائر — تبويب «الشارت» في الجوال يفتحه مباشرة (تفضيل محلي، لا يغادر المتصفح) */
export function RememberSymbol({ symbol }: { symbol: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(LAST_SYMBOL_KEY, symbol);
    } catch {
      /* التخزين غير متاح */
    }
  }, [symbol]);
  return null;
}
