import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { signSession, type SessionPayload } from "@/lib/session";
import { acceptInvite, getInviteByToken } from "@/lib/invites";
import { ensureDefaultGroups } from "@/lib/groups";
import type { Role } from "@prisma/client";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let i = 0; i < 8; i += 1) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const exists = await prisma.tenant.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function sessionFromMembership(
  user: { id: string; email: string; name: string },
  membership: { tenantId: string; role: Role; tenant: { name: string; slug: string } },
): Promise<SessionPayload> {
  return {
    sub: user.id,
    tid: membership.tenantId,
    email: user.email,
    name: user.name,
    role: membership.role,
    tname: membership.tenant.name,
    tslug: membership.tenant.slug,
  };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  organization?: string;
  invite?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with that email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const invite = input.invite ? await getInviteByToken(input.invite) : null;

  if (invite) {
    const createdUser = await prisma.user.create({
      data: { email, name: input.name.trim(), passwordHash },
    });
    await acceptInvite(input.invite!, createdUser.id, email);
    const membership = await prisma.membership.findFirst({
      where: { userId: createdUser.id, tenantId: invite.tenantId },
      include: { tenant: true },
    });
    if (!membership) throw new Error("Could not join workspace");
    const payload = await sessionFromMembership(createdUser, membership);
    return { token: await signSession(payload), payload };
  }

  const org = input.organization?.trim();
  if (!org) {
    throw new Error("Organization is required");
  }
  const slug = await uniqueSlug(org);
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { email, name: input.name.trim(), passwordHash },
    });
    const tenant = await tx.tenant.create({
      data: { name: org, slug },
    });
    await tx.membership.create({
      data: { userId: createdUser.id, tenantId: tenant.id, role: "OWNER" },
    });
    return { createdUser, tenant };
  });
  await ensureDefaultGroups(user.tenant.id);
  const payload: SessionPayload = {
    sub: user.createdUser.id,
    tid: user.tenant.id,
    email: user.createdUser.email,
    name: user.createdUser.name,
    role: "OWNER",
    tname: user.tenant.name,
    tslug: user.tenant.slug,
  };
  return { token: await signSession(payload), payload };
}

export async function loginUser(emailRaw: string, password: string, inviteToken?: string | null) {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: { tenant: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) throw new Error("Invalid email or password");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error("Invalid email or password");

  if (inviteToken) {
    const invite = await acceptInvite(inviteToken, user.id, email);
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, tenantId: invite.tenantId },
      include: { tenant: true },
    });
    if (!membership) throw new Error("Could not join workspace");
    const payload = await sessionFromMembership(user, membership);
    return { token: await signSession(payload), payload };
  }

  const membership = user.memberships[0];
  if (!membership) throw new Error("This account has no workspace");
  const payload = await sessionFromMembership(user, membership);
  return { token: await signSession(payload), payload };
}
