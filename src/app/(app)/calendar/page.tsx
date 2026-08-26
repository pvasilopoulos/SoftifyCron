import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { buildWeekCalendar } from "@/lib/calendar";
import { StatusPill } from "@/components/status-pill";
import { formatAbsolute } from "@/lib/format";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const session = await requireSession();
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tid } });
  const tz = tenant?.timezone ?? "UTC";
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
  const days = buildWeekCalendar(jobs, Boolean(tenant?.skipGreekHolidays), tz);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Schedule</p>
        <h1 className="mt-2 font-display text-4xl">Calendar</h1>
        <p className="mt-2 text-sm text-ink-dim">Next 7 days of armed jobs. Late and holiday skips show as blocked.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => (
          <section key={day.date} className="card p-4">
            <h2 className="font-medium">{day.label}</h2>
            {day.events.length === 0 ? (
              <p className="mt-3 text-sm text-ink-dim">Quiet</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {day.events.slice(0, 12).map((event, index) => (
                  <li key={`${event.jobId}-${event.at.toISOString()}-${index}`} className="text-sm">
                    <Link href={`/jobs/${event.jobId}`} className="font-medium hover:text-gold">
                      {event.name}
                    </Link>
                    <p className="text-xs text-ink-dim">
                      {formatAbsolute(event.at, tz)}
                      {event.kind === "late" ? " · late" : event.kind === "blocked" ? ` · ${event.reason}` : ""}
                    </p>
                    {event.lastStatus ? <StatusPill status={event.lastStatus} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
