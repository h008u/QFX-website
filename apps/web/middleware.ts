import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkBasicAuth } from "@/lib/admin-auth";
import { REF_COOKIE, REF_MAX_AGE, sanitizeRef } from "@/lib/referral";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

function adminGuard(req: NextRequest): NextResponse | null {
  if (!req.nextUrl.pathname.startsWith("/admin")) return null;
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return new NextResponse("Admin panel disabled: set ADMIN_USERNAME and ADMIN_PASSWORD", { status: 503 });
  }
  if (checkBasicAuth(req.headers.get("authorization"))) return null;
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="QFX Admin", charset="UTF-8"' },
  });
}

export async function middleware(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

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

  // حفظ كود الإحالة
  const ref = sanitizeRef(req.nextUrl.searchParams.get("ref"));
  if (ref) res.cookies.set(REF_COOKIE, ref, { maxAge: REF_MAX_AGE, path: "/", sameSite: "lax", httpOnly: false });

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|svg|webp|ico)$).*)"],
};
