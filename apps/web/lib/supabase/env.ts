export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** إن لم تُضبط مفاتيح Supabase يعمل الموقع ببيانات تجريبية */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
