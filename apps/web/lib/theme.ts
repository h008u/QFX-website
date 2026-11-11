"use client";

import { useEffect, useState } from "react";

import { THEME_KEY } from "./theme-script";

const isDarkNow = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark");

/** يتابع تغيّر الوضع (للشارتات والويدجتات التي تحتاج ألواناً صريحة) */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(isDarkNow());
    const obs = new MutationObserver(() => setDark(isDarkNow()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    if (dark) localStorage.setItem(THEME_KEY, "dark");
    else localStorage.removeItem(THEME_KEY);
  } catch {
    /* التخزين غير متاح */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0A0A0A" : "#FFFFFF");
}

/** ألوان الشارتات حسب الوضع */
export const chartPalette = (dark: boolean) =>
  dark
    ? { up: "#10B981", down: "#FF3B30", text: "#A1A1AA", grid: "#1C1C1F", border: "#27272A", line: "#E4E4E7" }
    : { up: "#059669", down: "#E2362B", text: "#71717A", grid: "#F1F1F3", border: "#E4E4E7", line: "#27272A" };
