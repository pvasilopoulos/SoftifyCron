import { parseEmails } from "./notify-policy";

export function clientsWithExactEmail<T extends { email: string }>(clients: T[], email: string): T[] {
  const needle = email.trim().toLowerCase();
  if (!needle) return [];
  return clients.filter((client) => parseEmails(client.email).includes(needle));
}

export function uniquePortalClientByEmail<T extends { email: string }>(clients: T[], email: string): T | null {
  const matches = clientsWithExactEmail(clients, email);
  return matches.length === 1 ? (matches[0] ?? null) : null;
}
