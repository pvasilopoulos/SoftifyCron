import { API_SCOPES, API_SCOPE_LABELS, type ApiScope } from "./api-scopes";

export type ApiParam = { name: string; in: "query" | "path"; required?: boolean; description: string };

export type ApiEndpointDoc = {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  description: string;
  scope: ApiScope | null;
  params?: ApiParam[];
  body?: Record<string, unknown>;
  response: string;
};

export const API_ENDPOINTS: ApiEndpointDoc[] = [
  {
    id: "me",
    method: "GET",
    path: "/me",
    summary: "Who am I",
    description: "Validate a token or session and see the workspace plus granted scopes.",
    scope: null,
    response: "{ actor, workspace, scopes }",
  },
  {
    id: "jobs-list",
    method: "GET",
    path: "/jobs",
    summary: "List jobs",
    description:
      "Workspace jobs, newest-armed first. Filter by search, type, group, or state. Paginate with take (max 200) and skip.",
    scope: "jobs.read",
    params: [
      { name: "q", in: "query", description: "Search name, URL, tags, cron" },
      { name: "type", in: "query", description: "HTTP, HEARTBEAT, WEBHOOK, TCP, DNS, TLS, DOMAIN" },
      { name: "group", in: "query", description: "Group id, or none for ungrouped" },
      { name: "state", in: "query", description: "armed, paused, or failing" },
      { name: "take", in: "query", description: "Page size, default 100, max 200" },
      { name: "skip", in: "query", description: "Offset for the next page" },
    ],
    response: "{ jobs, take, skip }",
  },
  {
    id: "jobs-create",
    method: "POST",
    path: "/jobs",
    summary: "Create a job",
    description: "Same payload as the job editor. Cron is validated. Target URLs are SSRF-checked.",
    scope: "jobs.write",
    body: {
      name: "Homepage ping",
      type: "HTTP",
      cronExpr: "*/5 * * * *",
      timezone: "Europe/Athens",
      method: "GET",
      url: "https://example.com/health",
      enabled: true,
    },
    response: "{ job } 201",
  },
  {
    id: "jobs-get",
    method: "GET",
    path: "/jobs/{id}",
    summary: "Get a job",
    description: "Full job config. Hook token hashes, golden bodies, and auth bodies are never returned.",
    scope: "jobs.read",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    response: "{ job }",
  },
  {
    id: "jobs-put",
    method: "PUT",
    path: "/jobs/{id}",
    summary: "Replace a job",
    description: "Full update using the job editor schema. Locked jobs reject changes unless the actor is an owner session.",
    scope: "jobs.write",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    body: {
      name: "Homepage ping",
      type: "HTTP",
      cronExpr: "*/5 * * * *",
      timezone: "Europe/Athens",
      method: "GET",
      url: "https://example.com/health",
      enabled: true,
    },
    response: "{ job }",
  },
  {
    id: "jobs-patch",
    method: "PATCH",
    path: "/jobs/{id}",
    summary: "Pause or resume",
    description: "Set enabled true/false without sending the rest of the job.",
    scope: "jobs.write",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    body: { enabled: false },
    response: "{ job }",
  },
  {
    id: "jobs-delete",
    method: "DELETE",
    path: "/jobs/{id}",
    summary: "Delete a job",
    description: "Permanently deletes the job and its runs.",
    scope: "jobs.delete",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    response: "{ ok: true }",
  },
  {
    id: "jobs-run",
    method: "POST",
    path: "/jobs/{id}/run",
    summary: "Run now",
    description: "Execute immediately with trigger MANUAL. Returns the new run id and status.",
    scope: "jobs.run",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    response: "{ runId, status, retried }",
  },
  {
    id: "jobs-heartbeat",
    method: "POST",
    path: "/jobs/{id}/heartbeat",
    summary: "Heartbeat ping",
    description: "For HEARTBEAT jobs. GET also works. Missed-beat alerts fire if the worker sees silence.",
    scope: "jobs.run",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    response: "{ ok, jobId, lastHeartbeatAt }",
  },
  {
    id: "jobs-skip",
    method: "POST",
    path: "/jobs/{id}/skip",
    summary: "Skip next fire",
    description: "Advances nextRunAt past the upcoming slot. Paused jobs cannot skip.",
    scope: "jobs.write",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    response: "{ job }",
  },
  {
    id: "jobs-snooze",
    method: "POST",
    path: "/jobs/{id}/snooze",
    summary: "Snooze alerts and fires",
    description: "hours must be 1, 2, 8, or 24. Send 0 to clear.",
    scope: "jobs.write",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    body: { hours: 2 },
    response: "{ job }",
  },
  {
    id: "jobs-ack",
    method: "POST",
    path: "/jobs/{id}/ack",
    summary: "Acknowledge a failure",
    description: "Clears the job from Inbox until a newer failing run.",
    scope: "jobs.run",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    body: { note: "Looking at it" },
    response: "{ job }",
  },
  {
    id: "jobs-once",
    method: "POST",
    path: "/jobs/{id}/once",
    summary: "Schedule a one-shot",
    description: "ISO-8601 at. Send { at: null } to clear.",
    scope: "jobs.write",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    body: { at: "2026-08-27T09:00:00.000Z" },
    response: "{ job }",
  },
  {
    id: "jobs-mute",
    method: "POST",
    path: "/jobs/{id}/mute",
    summary: "Mute a notify event",
    description: "event is one of failure, timeout, blocked, success, recovery, pause, missed, slow, escalate, watch, slo. hours 0 clears.",
    scope: "jobs.write",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    body: { event: "failure", hours: 8 },
    response: "{ job }",
  },
  {
    id: "jobs-duplicate",
    method: "POST",
    path: "/jobs/{id}/duplicate",
    summary: "Duplicate a job",
    description: "Creates a paused copy named “{name} copy”.",
    scope: "jobs.write",
    params: [{ name: "id", in: "path", required: true, description: "Job id" }],
    response: "{ job } 201",
  },
  {
    id: "jobs-bulk",
    method: "POST",
    path: "/jobs/bulk",
    summary: "Bulk actions",
    description: "pause, resume, run, delete, or move up to 100 jobs. delete needs jobs.delete, run needs jobs.run.",
    scope: "jobs.write",
    body: { action: "pause", ids: ["job_id"] },
    response: "{ count }",
  },
  {
    id: "runs-list",
    method: "GET",
    path: "/runs",
    summary: "List runs",
    description: "Newest first. Bodies are omitted; hasBody tells you if a body was stored.",
    scope: "runs.read",
    params: [
      { name: "jobId", in: "query", description: "Limit to one job" },
      { name: "status", in: "query", description: "PENDING, RUNNING, SUCCESS, FAILED, TIMEOUT, BLOCKED" },
      { name: "q", in: "query", description: "Search job name or error" },
      { name: "take", in: "query", description: "Page size, default 50, max 200" },
      { name: "skip", in: "query", description: "Offset" },
    ],
    response: "{ runs, take, skip }",
  },
  {
    id: "runs-get",
    method: "GET",
    path: "/runs/{id}",
    summary: "Get a run",
    description: "Add include=body to receive the stored response body (can be large).",
    scope: "runs.read",
    params: [
      { name: "id", in: "path", required: true, description: "Run id" },
      { name: "include", in: "query", description: "body to include the stored response" },
    ],
    response: "{ run }",
  },
  {
    id: "groups-list",
    method: "GET",
    path: "/groups",
    summary: "List groups",
    description: "Job groups including maintenance windows and job counts.",
    scope: "jobs.read",
    response: "{ groups }",
  },
  {
    id: "incidents-list",
    method: "GET",
    path: "/incidents",
    summary: "List incidents",
    description: "Opened when a job starts failing, closed on the first success. open=1 for current only.",
    scope: "jobs.read",
    params: [
      { name: "open", in: "query", description: "1 to only return open incidents" },
      { name: "jobId", in: "query", description: "Limit to one job" },
      { name: "take", in: "query", description: "Page size, default 50, max 200" },
    ],
    response: "{ incidents }",
  },
  {
    id: "calendar",
    method: "GET",
    path: "/calendar",
    summary: "Upcoming fires as iCal",
    description: "text/calendar feed of the next week of scheduled fires. Subscribe with a token in Google/Apple Calendar.",
    scope: "jobs.read",
    response: "text/calendar",
  },
  {
    id: "openapi",
    method: "GET",
    path: "/openapi",
    summary: "OpenAPI document",
    description: "Machine-readable spec for this API. No auth required.",
    scope: null,
    response: "OpenAPI 3.0 JSON",
  },
];

export function buildOpenApiDoc() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const endpoint of API_ENDPOINTS) {
    const item = paths[endpoint.path] ?? {};
    item[endpoint.method.toLowerCase()] = {
      operationId: endpoint.id,
      summary: endpoint.summary,
      description: endpoint.description,
      security: endpoint.scope ? [{ bearerAuth: [] }] : [],
      parameters: (endpoint.params ?? []).map((param) => ({
        name: param.name,
        in: param.in,
        required: Boolean(param.required),
        description: param.description,
        schema: { type: "string" },
      })),
      ...(endpoint.body
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { type: "object" },
                  example: endpoint.body,
                },
              },
            },
          }
        : {}),
      responses: {
        "200": { description: endpoint.response },
        "401": { description: "Missing or expired token" },
        "403": { description: "Token is missing the required scope" },
      },
    };
    paths[endpoint.path] = item;
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "SoftifyCron API",
      version: "1.1.0",
      description:
        "Tenant API for jobs, runs, heartbeats, ops actions, groups, incidents, and calendar. Authenticate with a Bearer workspace token (sc_…). Cookie sessions from the web app also work. Tokens can be scoped: jobs.read, jobs.write, jobs.run, jobs.delete, runs.read. Empty stored scopes keep legacy full access.",
    },
    servers: [{ url: "/api/v1" }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "sc_" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string" }, code: { type: "string" } },
        },
      },
    },
    tags: [
      { name: "Jobs" },
      { name: "Runs" },
      { name: "Ops" },
      { name: "Workspace" },
    ],
  };
}

export const OPENAPI_DOC = buildOpenApiDoc();

export function apiCurl(origin: string, endpoint: ApiEndpointDoc, tokenVar = "$SOFTIFYCRON_TOKEN") {
  const url = `${origin.replace(/\/$/, "")}/api/v1${endpoint.path.replace("{id}", "JOB_OR_RUN_ID")}`;
  const lines = [`curl -sS -X ${endpoint.method} "${url}"`];
  if (endpoint.scope !== null) {
    lines.push(`  -H "Authorization: Bearer ${tokenVar}"`);
  }
  if (endpoint.body) {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(`  -d '${JSON.stringify(endpoint.body)}'`);
  }
  return lines.join(" \\\n");
}

export { API_SCOPES, API_SCOPE_LABELS };
