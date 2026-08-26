export const TELEGRAM_MAX_CHARS = 4096;

export const DEFAULT_TELEGRAM_TEMPLATE = `{{subject}}
Workspace: {{tenant}}
Job: {{job.name}}
Events: {{events}}
Status: {{status}}
{{http}}
Consecutive failures: {{failures}}
{{paused}}
{{error}}
{{ack_url}}`;

export const NOTIFY_PLACEHOLDERS = [
  "subject",
  "tenant",
  "job.name",
  "job.id",
  "status",
  "events",
  "http",
  "error",
  "failures",
  "paused",
  "ack_url",
  "job_url",
  "run_id",
  "note",
] as const;

export type NotifyVars = Record<string, string>;

export function interpolateNotifyTemplate(body: string, vars: NotifyVars) {
  const rendered = String(body ?? "")
    .replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_all, key: string) => vars[key.toLowerCase()] ?? "")
    .replace(/\{\{[^}]*\}\}/g, "");
  return collapseBlank(rendered).slice(0, TELEGRAM_MAX_CHARS);
}

function collapseBlank(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function notifyVarsFrom(input: {
  jobId: string;
  jobName: string;
  tenantName: string;
  status: string | null;
  events: string[];
  httpStatus?: number | null;
  error?: string | null;
  failures: number;
  paused?: boolean;
  subject: string;
  ackUrl?: string | null;
  jobUrl: string;
  runId?: string | null;
  note?: string | null;
}): NotifyVars {
  return {
    "job.name": input.jobName,
    "job.id": input.jobId,
    subject: input.subject,
    tenant: input.tenantName,
    status: input.status ?? "",
    events: input.events.join(", "),
    http: input.httpStatus != null ? `HTTP: ${input.httpStatus}` : "",
    error: input.error?.trim() ? `Error: ${input.error.trim()}` : "",
    failures: String(input.failures),
    paused: input.paused ? "The job was auto-paused." : "",
    ack_url: input.ackUrl?.trim() ? `Ack: ${input.ackUrl.trim()}` : "",
    job_url: input.jobUrl,
    run_id: input.runId ?? "",
    note: input.note?.trim() ?? "",
  };
}

export function sampleNotifyVars(): NotifyVars {
  return notifyVarsFrom({
    jobId: "job_demo",
    jobName: "Site ping",
    tenantName: "Aurora Studio",
    status: "FAILED",
    events: ["failure"],
    httpStatus: 503,
    error: "HTTP 503",
    failures: 2,
    subject: "[SoftifyCron] Site ping failed",
    ackUrl: "https://cron.softify.gr/api/ack/demo",
    jobUrl: "https://cron.softify.gr/jobs/job_demo",
    runId: "run_demo",
    note: "",
  });
}
