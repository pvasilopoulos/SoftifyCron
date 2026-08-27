import { NextResponse } from "next/server";
import { originFromRequest } from "@/lib/app-url";
import { PORTAL_COOKIE, portalCookieOptions } from "@/lib/portal-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/portal/login", `${originFromRequest(request)}/`), 303);
  response.cookies.set(PORTAL_COOKIE, "", { ...portalCookieOptions(), maxAge: 0 });
  return response;
}
