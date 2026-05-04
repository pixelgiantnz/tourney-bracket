import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySiteCookie, verifyAdminCookie } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/admin/login" || pathname === "/official/login") {
    return NextResponse.next();
  }

  const siteToken = request.cookies.get("site_session")?.value;
  const siteOk = await verifySiteCookie(siteToken);
  if (!siteOk) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin")) {
    const adminToken = request.cookies.get("admin_session")?.value;
    const adminOk = await verifyAdminCookie(adminToken);
    if (!adminOk) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
