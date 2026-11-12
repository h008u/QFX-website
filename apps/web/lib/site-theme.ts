import "server-only";
import { DEFAULT_THEME, isThemeId, type SiteThemeId } from "@/config/themes";
import { getServerClient } from "./supabase/server";

export const APPEARANCE_KEY = "site.appearance";

export interface Appearance {
  theme: SiteThemeId;
}

/** الثيم المختار من لوحة التحكم (قراءة عامة لمفاتيح site.*)، والمؤسسي افتراضياً */
export async function getAppearance(): Promise<Appearance> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_THEME;
  const fallback: Appearance = { theme: isThemeId(fromEnv) ? fromEnv : DEFAULT_THEME };
  const sb = getServerClient();
  if (!sb) return fallback;
  try {
    const { data } = await sb.from("settings").select("value").eq("key", APPEARANCE_KEY).maybeSingle();
    const theme = (data?.value as { theme?: unknown } | null)?.theme;
    return isThemeId(theme) ? { theme } : fallback;
  } catch {
    return fallback;
  }
}
