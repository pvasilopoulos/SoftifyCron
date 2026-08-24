import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { signSession, type SessionPayload } from "@/lib/session";
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

async function sessionFromMembership(user: {
  id: string;
  email: string;
  name: string;
}, membership: { tenantId: string; role: Role; tenant: { name: string; slug: string } }): Promise<SessionPayload> {
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
  organization: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with that email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const slug = await uniqueSlug(input.organization);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash,
      },
    });
    const tenant = await tx.tenant.create({
      data: {
        name: input.organization.trim(),
        slug,
      },
    });
    await tx.membership.create({
      data: {
        userId: createdUser.id,
        tenantId: tenant.id,
        role: "OWNER",
      },
    });
    return { createdUser, tenant };
  });

  const payload: SessionPayload = {
    sub: user.createdUser.id,
    tid: user.tenant.id,
    email: user.createdUser.email,
    name: user.createdUser.name,
    role: "OWNER",
    tname: user.tenant.name,
    tslug: user.tenant.slug,
  };
  const token = await signSession(payload);
  return { token, payload };
}

export async function loginUser(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: { tenant: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new Error("Invalid email or password");
  }

  const membership = user.memberships[0];
  if (!membership) {
    throw new Error("This account has no workspace");
  }

  const payload = await sessionFromMembership(user, membership);
  const token = await signSession(payload);
  return { token, payload };
}
