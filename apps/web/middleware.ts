import { NextResponse, type NextRequest } from "next/server";
import { checkBasicAuth } from "@/lib/admin-auth";

export function middleware(req: NextRequest) {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return new NextResponse("Admin panel disabled: set ADMIN_USERNAME and ADMIN_PASSWORD", { status: 503 });
  }
  if (checkBasicAuth(req.headers.get("authorization"))) return NextResponse.next();
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="QFX Admin", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/admin/:path*"] };
