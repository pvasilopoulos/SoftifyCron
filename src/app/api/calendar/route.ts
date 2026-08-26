import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { calendarIcs } from "@/lib/ical";

export async function GET() {
  const session = await getTenantSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tid } });
  const jobs = await prisma.cronJob.findMany({
    where: { tenantId: session.tid, enabled: true },
    select: {
      id: true,
      name: true,
      cronExpr: true,
      timezone: true,
      lastStatus: true,
      nextRunAt: true,
      skipHolidays: true,
      skipWeekends: true,
      activeHoursStart: true,
      activeHoursEnd: true,
      snoozeUntil: true,
    },
    take: 120,
  });
  const ics = calendarIcs(jobs, Boolean(tenant?.skipGreekHolidays), `${tenant?.name ?? "SoftifyCron"} ops`);
  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="softifycron.ics"',
    },
  });
}
