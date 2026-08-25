export function buildCurl(job: {
  method: string;
  url: string;
  headers: unknown;
  body: string | null;
}) {
  const args = ["curl", "-sS", "-X", job.method];
  if (job.headers && typeof job.headers === "object" && !Array.isArray(job.headers)) {
    for (const [key, value] of Object.entries(job.headers as Record<string, unknown>)) {
      if (typeof value === "string") {
        args.push("-H", `${key}: ${value}`);
      }
    }
  }
  if (job.body && job.method !== "GET" && job.method !== "DELETE") {
    args.push("--data-raw", job.body);
  }
  args.push(job.url);
  return args
    .map((part) => (/[\s"'\\]/.test(part) ? `'${part.replace(/'/g, `'\\''`)}'` : part))
    .join(" ");
}
