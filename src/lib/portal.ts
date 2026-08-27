import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import { newPortalToken, portalUrl } from "@/lib/inbound";
import { parseEmails, parseEmailsStrict } from "@/lib/notify-policy";
import { assertSafeUrl } from "@/lib/ssrf";
import { isOpenIncident } from "@/lib/inbox";
import { statusStats } from "@/lib/status-stats";
import type { PortalPayload } from "@/lib/portal-session";

const JOB_SELECT = {
  id: true,
  name: true,
  type: true,
  enabled: true,
  lastStatus: true,
  lastRunAt: true,
  nextRunAt: true,
  ackedAt: true,
  ackedBy: true,
  ackNote: true,
  consecutiveFailures: true,
  timezone: true,
  groupId: true,
  group: { select: { id: true, name: true, color: true } },
} as const;

export type PortalClientInput = {
  name: string;
  email?: string;
  logoUrl?: string | null;
  groupIds: string[];
};

export async function listPortalClients(tenantId: string) {
  return prisma.portalClient.findMany({
    where: { tenantId },
    include: {
      groups: { include: { group: { select: { id: true, name: true, color: true } } } },
    },
    orderBy: { name: "asc" },
  });
}

export function publicPortalClient(
  client: Awaited<ReturnType<typeof listPortalClients>>[number],
  extra?: { raw?: string; origin?: string },
) {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    logoUrl: client.logoUrl,
    tokenPrefix: client.tokenPrefix,
    lastSeenAt: client.lastSeenAt,
    createdAt: client.createdAt,
    groups: client.groups.map((row) => row.group),
    raw: extra?.raw,
    url: extra?.raw && extra.origin ? portalUrl(extra.origin, extra.raw) : undefined,
  };
}

async function resolveGroupIds(tenantId: string, groupIds: string[]) {
  const unique = [...new Set(groupIds.map((id) => id.trim()).filter(Boolean))].slice(0, 50);
  if (unique.length === 0) throw new Error("Pick at least one job group");
  const groups = await prisma.jobGroup.findMany({
    where: { tenantId, id: { in: unique } },
    select: { id: true },
  });
  if (groups.length !== unique.length) throw new Error("One of those groups was not found");
  return unique;
}

export async function createPortalClient(tenantId: string, input: PortalClientInput) {
  const groupIds = await resolveGroupIds(tenantId, input.groupIds);
  const emails = parseEmailsStrict(input.email ?? "");
  const logoUrl = input.logoUrl?.trim() || "";
  if (logoUrl) await assertSafeUrl(logoUrl);
  const token = newPortalToken();
  const client = await prisma.portalClient.create({
    data: {
      tenantId,
      name: input.name.trim(),
      email: emails.join(", "),
      logoUrl: logoUrl || null,
      tokenHash: token.hash,
      tokenPrefix: token.prefix,
      groups: { create: groupIds.map((groupId) => ({ groupId })) },
    },
    include: {
      groups: { include: { group: { select: { id: true, name: true, color: true } } } },
    },
  });
  return { client, raw: token.token };
}

export async function updatePortalClient(tenantId: string, id: string, input: PortalClientInput) {
  const existing = await prisma.portalClient.findFirst({ where: { id, tenantId } });
  if (!existing) return null;
  const groupIds = await resolveGroupIds(tenantId, input.groupIds);
  const emails = parseEmailsStrict(input.email ?? "");
  const logoUrl = input.logoUrl?.trim() || "";
  if (logoUrl) await assertSafeUrl(logoUrl);
  const client = await prisma.portalClient.update({
    where: { id },
    data: {
      name: input.name.trim(),
      email: emails.join(", "),
      logoUrl: logoUrl || null,
      groups: {
        deleteMany: {},
        create: groupIds.map((groupId) => ({ groupId })),
      },
    },
    include: {
      groups: { include: { group: { select: { id: true, name: true, color: true } } } },
    },
  });
  return client;
}

export async function rotatePortalClient(tenantId: string, id: string) {
  const existing = await prisma.portalClient.findFirst({ where: { id, tenantId } });
  if (!existing) return null;
  const token = newPortalToken();
  const client = await prisma.portalClient.update({
    where: { id },
    data: {
      tokenHash: token.hash,
      tokenPrefix: token.prefix,
      sessionEpoch: { increment: 1 },
    },
    include: {
      groups: { include: { group: { select: { id: true, name: true, color: true } } } },
    },
  });
  return { client, raw: token.token };
}

export async function deletePortalClient(tenantId: string, id: string) {
  const result = await prisma.portalClient.deleteMany({ where: { id, tenantId } });
  return result.count > 0;
}

export async function findPortalClientByToken(raw: string) {
  const token = decodeURIComponent(raw ?? "").trim();
  if (!token.startsWith("pt_")) return null;
  return prisma.portalClient.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      tenant: { select: { id: true, name: true, timezone: true, statusLogoUrl: true } },
      groups: { select: { groupId: true } },
    },
  });
}

export async function findLegacyPortalTenant(raw: string) {
  const token = decodeURIComponent(raw ?? "").trim();
  if (!token.startsWith("pt_")) return null;
  return prisma.tenant.findFirst({
    where: { portalTokenHash: hashToken(token) },
    select: { id: true, name: true, timezone: true, statusLogoUrl: true },
  });
}

export async function findPortalClientByEmail(email: string) {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  const clients = await prisma.portalClient.findMany({
    where: { email: { contains: needle } },
    include: {
      tenant: { select: { id: true, name: true, timezone: true, statusLogoUrl: true } },
      groups: { select: { groupId: true } },
    },
    take: 20,
  });
  return clients.find((client) => parseEmails(client.email).includes(needle)) ?? null;
}

export async function hydratePortalAccess(payload: PortalPayload) {
  if (payload.kind === "legacy") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId },
      select: { id: true, name: true, timezone: true, statusLogoUrl: true },
    });
    if (!tenant) return null;
    return {
      kind: "legacy" as const,
      tenant,
      client: null,
      groupIds: null as string[] | null,
      actorName: tenant.name,
    };
  }
  if (!payload.clientId) return null;
  const client = await prisma.portalClient.findFirst({
    where: { id: payload.clientId, tenantId: payload.tenantId },
    include: {
      tenant: { select: { id: true, name: true, timezone: true, statusLogoUrl: true } },
      groups: { select: { groupId: true } },
    },
  });
  if (!client || client.sessionEpoch !== payload.sv) return null;
  const stale = !client.lastSeenAt || Date.now() - client.lastSeenAt.getTime() > 60_000;
  if (stale) {
    await prisma.portalClient.update({
      where: { id: client.id },
      data: { lastSeenAt: new Date() },
    });
  }
  return {
    kind: "client" as const,
    tenant: client.tenant,
    client,
    groupIds: client.groups.map((row) => row.groupId),
    actorName: client.name,
  };
}

export function portalJobWhere(tenantId: string, groupIds: string[] | null) {
  return {
    tenantId,
    ...(groupIds ? { groupId: { in: groupIds } } : {}),
  };
}

export async function listPortalJobs(tenantId: string, groupIds: string[] | null) {
  return prisma.cronJob.findMany({
    where: portalJobWhere(tenantId, groupIds),
    select: JOB_SELECT,
    orderBy: [{ enabled: "desc" }, { name: "asc" }],
    take: 200,
  });
}

export async function getPortalJob(tenantId: string, groupIds: string[] | null, jobId: string) {
  return prisma.cronJob.findFirst({
    where: { ...portalJobWhere(tenantId, groupIds), id: jobId },
    select: JOB_SELECT,
  });
}

export async function listPortalJobRuns(tenantId: string, jobId: string, take = 20) {
  return prisma.jobRun.findMany({
    where: { tenantId, jobId },
    select: { id: true, status: true, durationMs: true, startedAt: true },
    orderBy: { startedAt: "desc" },
    take,
  });
}

export async function portalHomeData(tenantId: string, groupIds: string[] | null) {
  const jobs = await listPortalJobs(tenantId, groupIds);
  const jobIds = jobs.map((job) => job.id);
  const failing = jobs.filter(
    (job) => job.lastStatus === "FAILED" || job.lastStatus === "TIMEOUT" || job.lastStatus === "BLOCKED",
  );
  const healthy = jobs.filter((job) => job.lastStatus === "SUCCESS").length;
  const open = jobs.filter((job) => isOpenIncident(job));
  const upcoming = jobs
    .filter((job) => job.enabled && job.nextRunAt)
    .sort((left, right) => (left.nextRunAt?.getTime() ?? 0) - (right.nextRunAt?.getTime() ?? 0))
    .slice(0, 8);
  const stats = await statusStats(tenantId, 30, jobIds);
  return { jobs, jobIds, failing: failing.length, healthy, open, upcoming, stats };
}
