export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function originFromRequest(request: { url: string; headers: { get(name: string): string | null } }) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim() || "";
  if (!host) return appUrl();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || url.protocol.replace(":", "") || "http";
  return `${proto}://${host}`;
}

export function jobHeartbeatUrl(jobId: string) {
  return `${appUrl()}/api/v1/jobs/${jobId}/heartbeat`;
}

export function statusPageUrl(slug: string) {
  return `${appUrl()}/status/${encodeURIComponent(slug)}`;
}
