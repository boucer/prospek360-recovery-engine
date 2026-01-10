// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ✅ ADMIN routes (inchangé dans l'esprit)
  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdminRoute) {
    // allow login endpoints
    if (pathname === "/admin/login" || pathname === "/api/admin/login") {
      return NextResponse.next();
    }

    const isAuthed = req.cookies.get("admin_auth")?.value === "1";
    if (isAuthed) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ✅ CLIENT "APP" routes à protéger
  const isAppRoute =
    pathname.startsWith("/audit") ||
    pathname.startsWith("/recovery") ||
    pathname.startsWith("/autopilot");

  if (!isAppRoute) return NextResponse.next();

  // ✅ Auth client via NextAuth token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?callbackUrl=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // admin (déjà existant)
    "/admin/:path*",
    "/api/admin/:path*",

    // app client (nouveau)
    "/audit/:path*",
    "/recovery/:path*",
    "/autopilot/:path*",
  ],
};
