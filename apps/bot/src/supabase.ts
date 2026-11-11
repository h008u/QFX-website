import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

let client: SupabaseClient | undefined;

/** عميل Supabase بصلاحية service_role (يتجاوز RLS) — للاستخدام داخل الخادم فقط */
export function db(): SupabaseClient {
  if (!client) {
    const env = getEnv();
    client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** للاختبارات فقط: استبدال العميل بقاعدة وهمية */
export function setDbForTests(fake: unknown) {
  client = fake as SupabaseClient;
}
