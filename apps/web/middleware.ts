import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CONSENT_COOKIE, parse } from "@/lib/consent";
import { REF_COOKIE, REF_MAX_AGE, sanitizeRef } from "@/lib/referral";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// صلاحيات لوحة الإدارة تُفحص في app/admin/layout.tsx وفي كل إجراء (أدوار Supabase: مدير/محرر/مشاهد)
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // تحديث جلسة Supabase (تجديد التوكن في الكوكيز)
  const hasSession = req.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (isSupabaseConfigured && hasSession) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }

  // حفظ كود الإحالة — فقط إذا سبق أن وافق الزائر على «نسب الإحالة»؛ وإلا يحفظه المتصفح في الجلسة
  // وينتظر الموافقة (components/consent/provider.tsx)
  const ref = sanitizeRef(req.nextUrl.searchParams.get("ref"));
  if (ref && parse(req.cookies.get(CONSENT_COOKIE)?.value)?.marketing) {
    res.cookies.set(REF_COOKIE, ref, { maxAge: REF_MAX_AGE, path: "/", sameSite: "lax", httpOnly: false });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|svg|webp|ico|woff2)$).*)"],
};
