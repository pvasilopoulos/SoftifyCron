import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  homePath,
  signSession,
  signTotpChallenge,
  verifySessionToken,
  verifyTotpChallenge,
  type SessionPayload,
} from "@/lib/session-token";

export {
  SESSION_COOKIE,
  homePath,
  signSession,
  signTotpChallenge,
  verifySessionToken,
  verifyTotpChallenge,
  type SessionPayload,
};

async function hydrateSession(session: SessionPayload): Promise<SessionPayload | null> {
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { platformRole: true, name: true, email: true },
  });
  if (!user) {
    await clearSessionCookie();
    return null;
  }
  const platform = user.platformRole === "SUPERADMIN";
  const base = {
    ...session,
    email: user.email,
    name: user.name,
    platform,
  };

  if (platform) {
    return { ...base, role: "OWNER" as const, grants: "", rolePerms: "" };
  }

  if (!session.tid) {
    const membership = await prisma.membership.findFirst({
      where: { userId: session.sub },
      include: { tenant: true, roleRef: true },
      orderBy: { createdAt: "asc" },
    });
    if (!membership) {
      await clearSessionCookie();
      return null;
    }
    return {
      ...base,
      tid: membership.tenantId,
      tname: membership.tenant.name,
      tslug: membership.tenant.slug,
      role: membership.role,
      grants: membership.grants,
      rolePerms: membership.roleRef?.permissions ?? "",
    };
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: session.sub, tenantId: session.tid } },
    include: { roleRef: true },
  });
  if (!membership) {
    await clearSessionCookie();
    return null;
  }
  return {
    ...base,
    role: membership.role,
    grants: membership.grants,
    rolePerms: membership.roleRef?.permissions ?? "",
  };
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

export async function getPlatformAdmin(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session?.platform) return null;
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
