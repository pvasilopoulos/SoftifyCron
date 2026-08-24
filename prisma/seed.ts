import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { getNextRunAt } from "../src/lib/cron";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo1234!", 12);

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

  const existing = await prisma.cronJob.count({ where: { tenantId } });
  if (existing === 0) {
    const jobs = [
      {
        name: "Status page ping",
        description: "Hits example.com every 15 minutes to prove the scheduler is alive.",
        cronExpr: "*/15 * * * *",
        method: "GET" as const,
        url: "https://example.com",
        enabled: true,
      },
      {
        name: "Morning digest",
        description: "Placeholder daily webhook. Point it at your own endpoint.",
        cronExpr: "0 9 * * 1-5",
        method: "POST" as const,
        url: "https://httpbingo.org/status/204",
        body: JSON.stringify({ source: "softifycron", kind: "digest" }),
        enabled: true,
      },
      {
        name: "Paused backup probe",
        description: "Disabled on purpose so you can toggle it from the jobs list.",
        cronExpr: "0 3 * * *",
        method: "GET" as const,
        url: "https://example.com",
        enabled: false,
      },
    ];

    for (const job of jobs) {
      await prisma.cronJob.create({
        data: {
          tenantId,
          name: job.name,
          description: job.description,
          cronExpr: job.cronExpr,
          timezone: "Europe/Athens",
          method: job.method,
          url: job.url,
          body: "body" in job ? job.body : null,
          enabled: job.enabled,
          nextRunAt: job.enabled
            ? getNextRunAt(job.cronExpr, "Europe/Athens")
            : null,
        },
      });
    }
  }

  console.log("Seeded demo workspace");
  console.log("  email:    demo@softifycron.dev");
  console.log("  password: Demo1234!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
