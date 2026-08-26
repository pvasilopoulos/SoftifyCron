import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiOptions, API_CORS } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { calendarIcs } from "@/lib/ical";

export function OPTIONS() {
  return apiOptions();
}

export async function GET(request: Request) {
  const auth = await requireV1(request, "jobs.read");
  if (auth.error) return auth.error;
  const tenant = await prisma.tenant.findUnique({ where: { id: auth.actor.tenantId } });
  const jobs = await prisma.cronJob.findMany({
    where: { tenantId: auth.actor.tenantId, enabled: true },
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
      ...API_CORS,
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="softifycron.ics"',
    },
  });
}
