import { jwtVerify, SignJWT } from "jose";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "softify_session";

export type SessionPayload = {
  sub: string;
  tid: string;
  email: string;
  name: string;
  role: Role;
  tname: string;
  tslug: string;
  platform: boolean;
  grants?: string;
  rolePerms?: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.tid !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.tname !== "string" ||
      typeof payload.tslug !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      tid: payload.tid,
      email: payload.email,
      name: payload.name,
      role: payload.role as Role,
      tname: payload.tname,
      tslug: payload.tslug,
      platform: payload.platform === true,
      grants: typeof payload.grants === "string" ? payload.grants : "",
      rolePerms: typeof payload.rolePerms === "string" ? payload.rolePerms : "",
    };
  } catch {
    return null;
  }
}
