import { NextResponse } from "next/server";
import { originFromRequest } from "@/lib/app-url";
import { signPortalSession, PORTAL_COOKIE, portalCookieOptions, type PortalPayload } from "@/lib/portal-session";

export async function redirectWithPortalSession(request: Request, payload: PortalPayload, path = "/portal") {
  const token = await signPortalSession(payload);
  const response = NextResponse.redirect(new URL(path, `${originFromRequest(request)}/`));
  response.cookies.set(PORTAL_COOKIE, token, portalCookieOptions());
  return response;
}
