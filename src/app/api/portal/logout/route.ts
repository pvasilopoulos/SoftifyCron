import { NextResponse } from "next/server";
import { PORTAL_COOKIE, portalCookieOptions } from "@/lib/portal-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/portal/login", request.url), 303);
  response.cookies.set(PORTAL_COOKIE, "", { ...portalCookieOptions(), maxAge: 0 });
  return response;
}
