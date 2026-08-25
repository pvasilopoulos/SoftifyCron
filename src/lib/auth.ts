import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { decryptSecret, encryptSecret, hashToken, randomToken } from "@/lib/crypto";
import { generateTotpSecret, totpOtpauth, verifyTotp } from "@/lib/totp";
import { sendMail } from "@/lib/mail";
import { signSession, signTotpChallenge, type SessionPayload } from "@/lib/session";
import { verifyTotpChallenge } from "@/lib/session-token";
import { acceptInvite, getInviteByToken } from "@/lib/invites";
import { ensureDefaultGroups } from "@/lib/groups";
import { ensureDefaultRoles } from "@/lib/roles";
import type { PlatformRole, Role } from "@prisma/client";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let i = 0; i < 8; i += 1) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const exists = await prisma.tenant.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function sessionFromMembership(
  user: { id: string; email: string; name: string; platformRole?: PlatformRole },
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
    platform: user.platformRole === "SUPERADMIN",
  };
}

export function platformSession(user: {
  id: string;
  email: string;
  name: string;
}): SessionPayload {
  return {
    sub: user.id,
    tid: "",
    email: user.email,
    name: user.name,
    role: "OWNER",
    tname: "Platform",
    tslug: "admin",
    platform: true,
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
  await ensureDefaultRoles(user.tenant.id);
  const payload: SessionPayload = {
    sub: user.createdUser.id,
    tid: user.tenant.id,
    email: user.createdUser.email,
    name: user.createdUser.name,
    role: "OWNER",
    tname: user.tenant.name,
    tslug: user.tenant.slug,
    platform: false,
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

  if (user.totpEnabled) {
    return {
      needsTotp: true as const,
      challenge: await signTotpChallenge(user.id),
    };
  }

  return finishLogin(user, inviteToken);
}

export async function loginWithTotp(challenge: string, code: string, inviteToken?: string | null) {
  const userId = await verifyTotpChallenge(challenge);
  if (!userId) throw new Error("That code expired. Sign in again.");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { tenant: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user?.totpEnabled || !user.totpSecretEnc) {
    throw new Error("Authenticator is not enabled");
  }
  const secret = decryptSecret(user.totpSecretEnc);
  if (!verifyTotp(secret, code)) throw new Error("Invalid authenticator code");
  return finishLogin(user, inviteToken);
}

async function finishLogin(
  user: {
    id: string;
    email: string;
    name: string;
    platformRole: PlatformRole;
    memberships: {
      tenantId: string;
      role: Role;
      tenant: { name: string; slug: string };
    }[];
  },
  inviteToken?: string | null,
) {
  if (user.platformRole === "SUPERADMIN" && !inviteToken) {
    const payload = platformSession(user);
    return { token: await signSession(payload), payload };
  }

  if (inviteToken) {
    const invite = await acceptInvite(inviteToken, user.id, user.email);
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

export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Account not found");
  if (!(await verifyPassword(current, user.passwordHash))) {
    throw new Error("Current password is wrong");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(next) },
  });
}

export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  const token = randomToken();
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  await sendMail({
    to: user.email,
    subject: "Reset your SoftifyCron password",
    text: `Reset your password:\n${appUrl}/reset?token=${encodeURIComponent(token)}\n\nThis link expires in one hour.`,
  });
}

export async function resetPasswordWithToken(token: string, password: string) {
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw new Error("This reset link is invalid or expired");
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordReset.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);
}

export async function beginTotp(userId: string, email: string) {
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecretEnc: encryptSecret(secret), totpEnabled: false },
  });
  return { secret, otpauth: totpOtpauth(email, secret) };
}

export async function confirmTotp(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecretEnc) throw new Error("Start authenticator setup first");
  const secret = decryptSecret(user.totpSecretEnc);
  if (!verifyTotp(secret, code)) throw new Error("Invalid authenticator code");
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true },
  });
}

export async function disableTotp(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Account not found");
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Password is wrong");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: false, totpSecretEnc: null },
  });
}
