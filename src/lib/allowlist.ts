export function parseAllowlist(raw: string | null | undefined) {
  return String(raw ?? "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function clientIp(headers: Headers | { get(name: string): string | null }) {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  if (first) return first.replace(/^::ffff:/, "");
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.replace(/^::ffff:/, "");
  return "";
}

export function ipAllowed(ip: string, allowlist: string[]) {
  if (allowlist.length === 0) return true;
  const value = ip.trim().replace(/^::ffff:/, "");
  if (!value) return false;
  return allowlist.some((rule) => matchRule(value, rule));
}

function matchRule(ip: string, rule: string) {
  if (rule === "*" || rule === ip) return true;
  const slash = rule.indexOf("/");
  if (slash === -1) return false;
  const base = rule.slice(0, slash);
  const bits = Number(rule.slice(slash + 1));
  if (!Number.isFinite(bits) || bits < 0) return false;
  return ipv4InCidr(ip, base, bits);
}

function ipv4ToInt(ip: string) {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

function ipv4InCidr(ip: string, base: string, bits: number) {
  const addr = ipv4ToInt(ip);
  const net = ipv4ToInt(base);
  if (addr == null || net == null || bits > 32) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (addr & mask) === (net & mask);
}
