import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

const APP_PREFIXES = ["/dashboard", "/jobs", "/runs", "/settings"];

function isAppPath(pathname: string) {
  return APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthPath(pathname: string) {
  return pathname === "/login" || pathname === "/register";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (isAppPath(pathname) && !session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isAuthPath(pathname) && session) {
    const invite = request.nextUrl.searchParams.get("invite");
    if (invite) {
      return NextResponse.redirect(new URL(`/invite/${invite}`, request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/jobs/:path*",
    "/runs/:path*",
    "/settings/:path*",
    "/login",
    "/register",
    "/invite/:path*",
  ],
};
