"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { isThemeId, SITE_THEMES } from "@/config/themes";
import { audit, requireRole } from "@/lib/admin/session";
import { APPEARANCE_KEY } from "@/lib/site-settings";

/** يحفظ ثيم الموقع العام (المدير فقط) ويعيد بناء كل الصفحات */
export async function saveAppearanceAction(theme: string): Promise<ActionResult> {
  const ctx = await requireRole("admin");
  if (!isThemeId(theme)) return { ok: false, message: "ثيم غير معروف" };
  const value = { theme };
  const { data: existing } = await ctx.db.from("settings").select("key").eq("key", APPEARANCE_KEY).maybeSingle();
  const { error } = existing
    ? await ctx.db.from("settings").update({ value, updated_by: ctx.demo ? null : ctx.user.id }).eq("key", APPEARANCE_KEY)
    : await ctx.db.from("settings").insert({ key: APPEARANCE_KEY, value, updated_by: ctx.demo ? null : ctx.user.id });
  if (error) return { ok: false, message: error.message };
  await audit(ctx, "appearance.save", theme);
  revalidatePath("/", "layout");
  const name = SITE_THEMES.find((t) => t.id === theme)?.name;
  return { ok: true, message: `تم تطبيق ثيم «${name}» على الموقع ✅` };
}
