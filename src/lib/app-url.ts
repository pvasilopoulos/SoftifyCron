export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function jobHeartbeatUrl(jobId: string) {
  return `${appUrl()}/api/v1/jobs/${jobId}/heartbeat`;
}
