import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  signSession,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session-token";

export { SESSION_COOKIE, signSession, verifySessionToken, type SessionPayload };

async function hydrateSession(session: SessionPayload): Promise<SessionPayload | null> {
  if (!session.tid) return session;
  if (session.platform) return { ...session, grants: session.grants ?? "" };
  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: session.sub, tenantId: session.tid } },
  });
  if (!membership) {
    await clearSessionCookie();
    return null;
  }
  return { ...session, role: membership.role, grants: membership.grants };
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return hydrateSession(session);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireTenantSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!session.tid) redirect("/admin");
  return session;
}

export async function requirePlatformAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!session.platform) redirect("/dashboard");
  return session;
}

export async function getTenantSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session?.tid) return null;
  return session;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
