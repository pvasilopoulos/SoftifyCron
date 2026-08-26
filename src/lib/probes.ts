import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isBlockedHostname, isPrivateIp } from "./ssrf";

export type ProbeKind = "TCP" | "DNS" | "TLS";

export function isProbeType(type: string): type is ProbeKind {
  return type === "TCP" || type === "DNS" || type === "TLS";
}

export function skipsHttpStatusAssert(type: string) {
  return isProbeType(type) || type === "DOMAIN";
}

export type ProbeTarget = {
  host: string;
  port: number;
};

export function defaultProbePort(kind: ProbeKind) {
  if (kind === "TLS") return 443;
  if (kind === "TCP") return 80;
  return 53;
}

export function parseProbeTarget(raw: string, kind: ProbeKind): ProbeTarget {
  const value = String(raw ?? "").trim();
  if (!value) throw new Error("Host is required");
  let host = value;
  let port = defaultProbePort(kind);
  if (value.includes("://")) {
    const url = new URL(value);
    host = url.hostname;
    if (url.port) port = Number(url.port);
    else if (url.protocol === "https:") port = 443;
    else if (url.protocol === "http:") port = 80;
  } else if (value.startsWith("[")) {
    const end = value.indexOf("]");
    host = value.slice(1, end);
    const rest = value.slice(end + 1);
    if (rest.startsWith(":")) port = Number(rest.slice(1));
  } else {
    const colon = value.lastIndexOf(":");
    if (colon > 0 && !value.includes("/")) {
      const maybePort = Number(value.slice(colon + 1));
      if (Number.isFinite(maybePort) && maybePort > 0) {
        host = value.slice(0, colon);
        port = maybePort;
      }
    }
  }
  host = host.replace(/^\[|\]$/g, "").trim().toLowerCase();
  if (!host) throw new Error("Host is required");
  if (!Number.isFinite(port) || port < 1 || port > 65535) throw new Error("Port must be 1–65535");
  return { host, port: Math.trunc(port) };
}

export async function assertSafeHost(host: string) {
  if (isBlockedHostname(host)) throw new Error("That host is not allowed");
  if (isIP(host) && isPrivateIp(host)) throw new Error("That host is not allowed");
  const records = await lookup(host, { all: true }).catch(() => []);
  if (records.length === 0) throw new Error("Could not resolve host");
  for (const record of records) {
    if (isPrivateIp(record.address)) throw new Error("That host resolves to a private address");
  }
  return records.map((item) => item.address);
}

export function daysUntil(date: Date, now = new Date()) {
  return Math.floor((date.getTime() - now.getTime()) / 86_400_000);
}

export function certExpiresTooSoon(validTo: Date, minDays: number, now = new Date()) {
  const days = daysUntil(validTo, now);
  return days < Math.max(0, minDays);
}

export function dnsMatchesExpected(addresses: string[], expected: string) {
  const want = expected.trim().toLowerCase();
  if (!want) return true;
  return addresses.some((item) => item.toLowerCase() === want);
}

export async function assertJobTarget(type: string, raw: string) {
  if (isProbeType(type) || type === "DOMAIN") {
    const target = parseProbeTarget(raw, type === "DOMAIN" ? "TLS" : type);
    await assertSafeHost(target.host);
    return;
  }
  const { assertSafeUrl } = await import("./ssrf");
  await assertSafeUrl(raw);
}
