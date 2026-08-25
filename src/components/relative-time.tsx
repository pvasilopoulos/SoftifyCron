"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatRelative } from "@/lib/format";

export function RelativeTime({
  value,
  timeZone = "UTC",
  className,
}: {
  value: Date | string | null | undefined;
  timeZone?: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!value) return <span className={className}>—</span>;
  const date = new Date(value);
  const absolute = formatDateTime(date, timeZone);
  return (
    <time className={className} dateTime={date.toISOString()} title={absolute}>
      {formatRelative(date, new Date(now))}
    </time>
  );
}
