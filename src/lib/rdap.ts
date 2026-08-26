import { daysUntil } from "./probes";

export function rdapUrl(host: string) {
  const clean = host.trim().toLowerCase().replace(/\.$/, "");
  if (!clean) throw new Error("Domain is required");
  return `https://rdap.org/domain/${encodeURIComponent(clean)}`;
}

export function parseRdapExpiry(payload: unknown, now = new Date()) {
  const events =
    payload && typeof payload === "object" && Array.isArray((payload as { events?: unknown }).events)
      ? ((payload as { events: { eventAction?: string; eventDate?: string }[] }).events)
      : [];
  const expiry = events.find((event) => {
    const action = String(event.eventAction ?? "").toLowerCase();
    return action.includes("expiration") || action === "expire";
  });
  const date = expiry?.eventDate ? new Date(expiry.eventDate) : null;
  if (!date || Number.isNaN(date.getTime())) return { expiresAt: null as Date | null, days: null as number | null };
  return { expiresAt: date, days: daysUntil(date, now) };
}
