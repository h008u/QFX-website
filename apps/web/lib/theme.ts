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
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0F0F0F" : "#FFFFFF");
}

const cssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

/** ألوان الشارتات حسب الوضع والثيم (الصعود/الهبوط/لون التمييز من متغيرات الثيم) */
export const chartPalette = (dark: boolean) => {
  const base = dark
    ? { up: "#089981", down: "#F23645", text: "#B2B5BE", grid: "#1E222D", border: "#2A2E39", line: "#D1D4DC", blue: "#2962FF", area: "rgba(41,98,255,0.28)" }
    : { up: "#089981", down: "#F23645", text: "#131722", grid: "#F0F3FA", border: "#E0E3EB", line: "#131722", blue: "#2962FF", area: "rgba(41,98,255,0.18)" };
  const hsl = (n: string, f: string) => {
    const v = cssVar(n, "");
    return v ? `hsl(${v})` : f;
  };
  const accent = cssVar("--chart-accent", base.blue);
  return {
    ...base,
    up: cssVar("--chart-up", base.up),
    down: cssVar("--chart-down", base.down),
    blue: accent,
    area: accent.length === 7 ? accent + (dark ? "47" : "2E") : base.area,
    text: hsl("--foreground", base.text),
    grid: hsl("--surface", base.grid),
    border: hsl("--border", base.border),
    line: hsl("--foreground", base.line),
  };
};

export const CHART_FONT = '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';

/** خط أرقام الشارت حسب الثيم */
export const chartFont = () => cssVar("--font-num", CHART_FONT);
