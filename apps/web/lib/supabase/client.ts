"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

let client: SupabaseClient | null = null;

/** عميل المتصفح (مفتاح anon + RLS) — يُستخدم للاشتراك في Realtime */
export function getBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}
