import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/** عميل الخادم بمفتاح anon (يخضع لـ RLS) */
export function getServerClient() {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
}

/** عميل بصلاحية service_role — للوحة التحكم فقط (بعد التحقق من هوية المدير) */
export function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key, { auth: { persistSession: false } });
}
