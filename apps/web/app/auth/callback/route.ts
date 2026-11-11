import { NextResponse, type NextRequest } from "next/server";
import { getAuthClient } from "@/lib/supabase/server";

/** يستقبل رابط تسجيل الدخول من البريد ويحوّل الكود إلى جلسة */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/account";
  // منع إعادة التوجيه لمواقع خارجية
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account";

  if (code) {
    const supabase = await getAuthClient();
    const { error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? { error: new Error("not configured") };
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("[auth] callback", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
