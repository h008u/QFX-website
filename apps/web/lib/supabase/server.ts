import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/** عميل الخادم بمفتاح anon بدون جلسة (يخضع لـ RLS) — للبيانات العامة القابلة للتخزين المؤقت */
export function getServerClient() {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
}

/** عميل الخادم مع جلسة المستخدم الحالي (من الكوكيز) — للصفحات والإجراءات الخاصة بالعضو */
export async function getAuthClient() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // يُستدعى من Server Component — الـ middleware يتولى تحديث الجلسة
        }
      },
    },
  });
}

/** عميل بصلاحية service_role — للوحة التحكم فقط (بعد التحقق من هوية المدير) */
export function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key, { auth: { persistSession: false } });
}
