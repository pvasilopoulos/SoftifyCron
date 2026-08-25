"use client";

import { useMemo } from "react";
import { previewRuns } from "@/lib/cron";
import { scheduleBlockReason } from "@/lib/schedule-policy";
import { formatAbsolute } from "@/lib/format";

export function FirePreview({
  cronExpr,
  timezone,
  skipHolidays,
  skipWeekends,
  activeHoursStart,
  activeHoursEnd,
  tenantHolidays,
}: {
  cronExpr: string;
  timezone: string;
  skipHolidays: boolean;
  skipWeekends: boolean;
  activeHoursStart: string;
  activeHoursEnd: string;
  tenantHolidays: boolean;
}) {
  const rows = useMemo(() => {
    try {
      return previewRuns(cronExpr, timezone, 10).map((at) => ({
        at,
        reason: scheduleBlockReason(
          { timezone, skipHolidays, skipWeekends, activeHoursStart, activeHoursEnd },
          tenantHolidays,
          at,
        ),
      }));
    } catch {
      return [];
    }
  }, [
    cronExpr,
    timezone,
    skipHolidays,
    skipWeekends,
    activeHoursStart,
    activeHoursEnd,
    tenantHolidays,
  ]);

  if (rows.length === 0) {
    return <p className="text-sm text-ink-dim">Cron is invalid or has no upcoming fires.</p>;
  }

  return (
    <ol className="space-y-2 text-sm">
      {rows.map((row) => (
        <li key={row.at.toISOString()} className="flex items-center justify-between gap-3">
          <span className={`mono ${row.reason ? "text-ink-dim" : ""}`}>
            {formatAbsolute(row.at, timezone)}
          </span>
          <span className={row.reason ? "text-ink-dim" : "text-gold-2"}>
            {row.reason ?? "fires"}
          </span>
        </li>
      ))}
    </ol>
  );
}
