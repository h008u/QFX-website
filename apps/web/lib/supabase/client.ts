"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

let client: SupabaseClient | null = null;

/** عميل المتصفح (مفتاح anon + RLS + جلسة المستخدم من الكوكيز) — للـ Realtime والتعليقات */
export function getBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
