import "server-only";
import { normalizeContent, type SiteContent } from "@/config/site-content";
import { DEFAULT_THEME, isThemeId, type SiteThemeId } from "@/config/themes";
import { demoDb } from "./admin/demo";
import { isSupabaseConfigured } from "./supabase/env";
import { getServerClient } from "./supabase/server";

export const APPEARANCE_KEY = "site.appearance";
export const CONTENT_KEY = "site.content";

/** يقرأ مفتاح site.* (عام القراءة). بدون Supabase يقرأ من قاعدة المعاينة حتى تظهر التعديلات أثناء التجربة */
export async function readSiteSetting(key: string): Promise<unknown> {
  try {
    if (!isSupabaseConfigured) {
      const { data } = await (demoDb() as unknown as { from: (t: string) => any }).from("settings").select("value").eq("key", key).maybeSingle(); // eslint-disable-line @typescript-eslint/no-explicit-any
      return data?.value ?? null;
    }
    const sb = getServerClient();
    if (!sb) return null;
    const { data } = await sb.from("settings").select("value").eq("key", key).maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

export async function getAppearance(): Promise<{ theme: SiteThemeId }> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_THEME;
  const theme = ((await readSiteSetting(APPEARANCE_KEY)) as { theme?: unknown } | null)?.theme;
  return { theme: isThemeId(theme) ? theme : isThemeId(fromEnv) ? fromEnv : DEFAULT_THEME };
}

export async function getSiteContent(): Promise<SiteContent> {
  return normalizeContent(await readSiteSetting(CONTENT_KEY));
}
