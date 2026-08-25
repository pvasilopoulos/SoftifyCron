import { prisma } from "@/lib/prisma";

export const DEMO_EMAILS = [
  "admin@softifycron.dev",
  "demo@softifycron.dev",
  "member@softifycron.dev",
  "customer@softifycron.dev",
] as const;

export async function listDemoSeedUsers() {
  return prisma.user.findMany({
    where: { email: { in: [...DEMO_EMAILS] } },
    select: { email: true, name: true, platformRole: true },
    orderBy: { email: "asc" },
  });
}
