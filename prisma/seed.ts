import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { getNextRunAt } from "../src/lib/cron";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo1234!", 12);
  const adminHash = await bcrypt.hash("Admin1234!", 12);

  await prisma.user.upsert({
    where: { email: "admin@softifycron.dev" },
    update: { platformRole: "SUPERADMIN" },
    create: {
      email: "admin@softifycron.dev",
      name: "Platform Admin",
      passwordHash: adminHash,
      platformRole: "SUPERADMIN",
    },
  });

  const demo = await prisma.user.upsert({
    where: { email: "demo@softifycron.dev" },
    update: {},
    create: {
      email: "demo@softifycron.dev",
      name: "Dana Mercer",
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          tenant: {
            create: {
              name: "Aurora Studio",
              slug: "aurora-studio",
              timezone: "Europe/Athens",
            },
          },
        },
      },
    },
    include: { memberships: true },
  });

  const tenantId =
    demo.memberships[0]?.tenantId ??
    (
      await prisma.membership.findFirst({
        where: { userId: demo.id },
      })
    )?.tenantId;

  if (!tenantId) {
    throw new Error("Failed to resolve demo tenant");
  }

  const groupCount = await prisma.jobGroup.count({ where: { tenantId } });
  if (groupCount === 0) {
    await prisma.jobGroup.createMany({
      data: [
        { tenantId, name: "Ops", slug: "ops", color: "#7dffce" },
        { tenantId, name: "Integrations", slug: "integrations", color: "#8b9cff" },
        { tenantId, name: "Billing", slug: "billing", color: "#ffc46b" },
      ],
    });
  }

  const groups = await prisma.jobGroup.findMany({ where: { tenantId } });
  const bySlug = Object.fromEntries(groups.map((group) => [group.slug, group.id]));

  const existing = await prisma.cronJob.count({ where: { tenantId } });
  if (existing === 0) {
    const jobs = [
      {
        name: "Status page ping",
        description: "Hits example.com every 15 minutes to prove the scheduler is alive.",
        cronExpr: "*/15 * * * *",
        method: "GET" as const,
        type: "HEARTBEAT" as const,
        tags: "critical,uptime",
        url: "https://example.com",
        enabled: true,
        groupId: bySlug.ops ?? null,
        retryMax: 2,
        retryDelaySec: 60,
      },
      {
        name: "Morning digest",
        description: "Placeholder daily webhook. Point it at your own endpoint.",
        cronExpr: "0 9 * * 1-5",
        method: "POST" as const,
        type: "WEBHOOK" as const,
        tags: "digest",
        url: "https://httpbingo.org/status/204",
        body: JSON.stringify({ source: "softifycron", kind: "digest" }),
        enabled: true,
        groupId: bySlug.billing ?? null,
        retryMax: 1,
        retryDelaySec: 120,
      },
      {
        name: "Paused backup probe",
        description: "Disabled on purpose so you can toggle it from the jobs list.",
        cronExpr: "0 3 * * *",
        method: "GET" as const,
        type: "HTTP" as const,
        tags: "backup",
        url: "https://example.com",
        enabled: false,
        groupId: bySlug.integrations ?? null,
        retryMax: 0,
        retryDelaySec: 60,
      },
    ];

    for (const job of jobs) {
      await prisma.cronJob.create({
        data: {
          tenantId,
          groupId: job.groupId,
          name: job.name,
          description: job.description,
          type: job.type,
          tags: job.tags,
          cronExpr: job.cronExpr,
          timezone: "Europe/Athens",
          method: job.method,
          url: job.url,
          body: "body" in job ? job.body : null,
          enabled: job.enabled,
          retryMax: job.retryMax,
          retryDelaySec: job.retryDelaySec,
          nextRunAt: job.enabled
            ? getNextRunAt(job.cronExpr, "Europe/Athens")
            : null,
        },
      });
    }
  } else {
    await prisma.cronJob.updateMany({
      where: { tenantId, name: "Status page ping", groupId: null },
      data: { groupId: bySlug.ops, type: "HEARTBEAT", tags: "critical,uptime" },
    });
    await prisma.cronJob.updateMany({
      where: { tenantId, name: "Morning digest", groupId: null },
      data: { groupId: bySlug.billing, type: "WEBHOOK", tags: "digest" },
    });
    await prisma.cronJob.updateMany({
      where: { tenantId, name: "Paused backup probe", groupId: null },
      data: { groupId: bySlug.integrations, tags: "backup" },
    });
  }

  const memberUser = await prisma.user.upsert({
    where: { email: "member@softifycron.dev" },
    update: {},
    create: {
      email: "member@softifycron.dev",
      name: "Mira Chen",
      passwordHash,
    },
  });
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: memberUser.id, tenantId } },
    update: { role: "MEMBER", grants: "jobs.run" },
    create: { userId: memberUser.id, tenantId, role: "MEMBER", grants: "jobs.run" },
  });

  console.log("Seeded demo workspace");
  console.log("  platform admin: admin@softifycron.dev / Admin1234!");
  console.log("  customer:       demo@softifycron.dev / Demo1234!");
  console.log("  member:         member@softifycron.dev / Demo1234! (Aurora, run-only)");

  const heliosOwner = await prisma.user.upsert({
    where: { email: "customer@softifycron.dev" },
    update: {},
    create: {
      email: "customer@softifycron.dev",
      name: "Helen Costa",
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          tenant: {
            create: {
              name: "Helios Labs",
              slug: "helios-labs",
              timezone: "Europe/Athens",
            },
          },
        },
      },
    },
  });
  const heliosId =
    (
      await prisma.membership.findFirst({
        where: { userId: heliosOwner.id, tenant: { slug: "helios-labs" } },
      })
    )?.tenantId;
  if (heliosId) {
    const heliosJobs = await prisma.cronJob.count({ where: { tenantId: heliosId } });
    if (heliosJobs === 0) {
      await prisma.cronJob.create({
        data: {
          tenantId: heliosId,
          name: "Helios heartbeat",
          description: "Second customer job — invisible to Aurora Studio.",
          type: "HEARTBEAT",
          cronExpr: "*/10 * * * *",
          timezone: "Europe/Athens",
          method: "GET",
          url: "https://example.com",
          enabled: true,
          nextRunAt: getNextRunAt("*/10 * * * *", "Europe/Athens"),
        },
      });
    }
  }
  console.log("  customer:       customer@softifycron.dev / Demo1234!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
