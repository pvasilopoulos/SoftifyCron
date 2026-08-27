import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const PORTAL_COOKIE = "sc_portal";
export const PORTAL_MAX_AGE = 60 * 60 * 24 * 14;

export type PortalPayload = {
  kind: "client" | "legacy";
  tenantId: string;
  clientId: string | null;
  name: string;
  sv: number;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signPortalSession(payload: PortalPayload) {
  return new SignJWT({
    kind: payload.kind,
    tenantId: payload.tenantId,
    clientId: payload.clientId,
    name: payload.name,
    sv: payload.sv,
    purpose: "portal",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PORTAL_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifyPortalSession(token: string): Promise<PortalPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "portal") return null;
    if (payload.kind !== "client" && payload.kind !== "legacy") return null;
    if (typeof payload.tenantId !== "string" || typeof payload.name !== "string") return null;
    const clientId = typeof payload.clientId === "string" ? payload.clientId : null;
    if (payload.kind === "client" && !clientId) return null;
    return {
      kind: payload.kind,
      tenantId: payload.tenantId,
      clientId,
      name: payload.name,
      sv: typeof payload.sv === "number" ? payload.sv : 0,
    };
  } catch {
    return null;
  }
}

export async function readPortalCookie() {
  const jar = await cookies();
  const raw = jar.get(PORTAL_COOKIE)?.value;
  if (!raw) return null;
  return verifyPortalSession(raw);
}

export function portalCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: PORTAL_MAX_AGE,
  };
}
