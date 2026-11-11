import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthClient, getServiceClient } from "@/lib/supabase/server";
import { demoDb } from "./demo";

export type StaffRole = "admin" | "editor" | "viewer";

export interface AdminContext {
  demo: boolean;
  db: SupabaseClient;
  user: { id: string; email: string; name: string };
  role: StaffRole;
}

export const ROLE_LABEL: Record<StaffRole, string> = { admin: "مدير", editor: "محرر", viewer: "مشاهد" };
const RANK: Record<StaffRole, number> = { viewer: 1, editor: 2, admin: 3 };
export const canEdit = (r: StaffRole) => RANK[r] >= RANK.editor;

/**
 * سياق اللوحة: المستخدم الحالي ودوره، وعميل قاعدة البيانات (Supabase مع RLS، أو قاعدة المعاينة).
 * غير المسجّل يُحوّل لصفحة الدخول، وغير الفريق يحصل على null.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  if (!isSupabaseConfigured) {
    return {
      demo: true,
      db: demoDb() as unknown as SupabaseClient,
      user: { id: "demo-admin", email: "preview@qfx.local", name: "مدير المعاينة" },
      role: "admin",
    };
  }
  const sb = (await getAuthClient())!;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await sb.from("profiles").select("full_name, role").eq("id", user.id).single();
  const role = profile?.role as string | undefined;
  if (role !== "admin" && role !== "editor" && role !== "viewer") return null;
  return { demo: false, db: sb, user: { id: user.id, email: user.email ?? "", name: profile?.full_name || user.email || "" }, role };
}

/** للإجراءات: يتحقق من الدور المطلوب ويرجع السياق */
export async function requireRole(min: StaffRole): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx || RANK[ctx.role] < RANK[min]) throw new Error("ليست لديك صلاحية لهذا الإجراء");
  return ctx;
}

/** عميل service_role (لإجراءات المدير مثل تغيير الأدوار) — أو قاعدة المعاينة */
export function privilegedDb(ctx: AdminContext): SupabaseClient | null {
  return ctx.demo ? ctx.db : getServiceClient();
}

/** يسجّل الإجراء في سجل النشاط */
export async function audit(ctx: AdminContext, action: string, target?: string | null, details?: unknown) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const { error } = await ctx.db.from("audit_log").insert({
    actor_id: ctx.user.id,
    actor_email: ctx.user.name || ctx.user.email,
    action,
    target: target ?? null,
    details: details ?? null,
    ip,
  });
  if (error) console.error("[audit]", error.message);
}
