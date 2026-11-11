import "server-only";
import { mergeSettings, type BotSettings } from "@qfx/shared";
import type { AdminContext } from "./session";

export async function loadAdminSettings(ctx: AdminContext): Promise<BotSettings> {
  const { data } = await ctx.db.from("settings").select("key, value").not("key", "like", "state.%");
  return mergeSettings((data ?? []) as { key: string; value: unknown }[]);
}

export async function loadState<T>(ctx: AdminContext, name: string, fallback: T): Promise<T> {
  const { data } = await ctx.db.from("settings").select("value").eq("key", `state.${name}`).maybeSingle();
  return (data?.value as T) ?? fallback;
}
