export type DocBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "note"; text: string };

export type DocSection = {
  id: string;
  title: string;
  kicker: string;
  blocks: DocBlock[];
};

export const APP_DOC_SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "What SoftifyCron is",
    kicker: "Product",
    blocks: [
      {
        type: "p",
        text: "SoftifyCron is a multi-tenant cron control plane. Each workspace owns isolated jobs, runs, secrets, people, and alerts. A background worker claims due jobs from MySQL and executes HTTP, probe, webhook, and heartbeat work. Production lives at cron.softify.gr and deploys from the main branch.",
      },
      {
        type: "ul",
        items: [
          "Home shows failing jobs, upcoming fires, worker health, and today’s run counts.",
          "Jobs is the list: filter by search, type, group, and armed / paused / failing.",
          "A job page is the ops desk: run now, pause, skip, snooze, ack, mute, hook URL, history, and the response board.",
          "Runs is the global history. Responses is a table of stored bodies. Inbox is unacked failures.",
          "Calendar is the next week of fires (and an .ics download). Usage is volume, heatmap, and secret hygiene. Audit is who changed what.",
        ],
      },
      {
        type: "note",
        text: "⌘K / Ctrl+K opens the command palette. The left rail groups Platform (superadmins), Workspace, Team, and Account. Appearance lives under Settings.",
      },
    ],
  },
  {
    id: "jobs",
    title: "Jobs",
    kicker: "Core",
    blocks: [
      {
        type: "p",
        text: "A job is a named schedule plus a target. Create from Jobs → New job. Templates seed common setups (heartbeat, keyword, TLS, domain). Every job belongs to an optional group, has tags, a cron expression, a timezone, and an enabled flag.",
      },
      {
        type: "ul",
        items: [
          "Schedule: five-field cron, timezone, skip weekends, skip Greek holidays, active hours, snooze until, and a one-shot onceAt.",
          "HTTP: method, URL, headers, body, timeout, retries, and {{SECRET:key}} placeholders resolved at run time.",
          "Assertions: expected status, JSON path equals, body contains, JSON schema, final URL, extra hosts, and a golden body snapshot.",
          "Auth hop: optional authUrl + authBody to fetch a bearer token before the main request.",
          "Chains: dependsOnJobId (must be healthy) and followUpJobId (runs after a scheduled success).",
          "Limits: pauseAfter N consecutive failures, slowAfterMs, SLO fails per day, config lock (only owners change target/schedule).",
          "Inbound hook: a per-job URL that fires the job as MANUAL. Optional GitHub/GitLab HMAC. Heartbeat jobs also expose /api/v1/jobs/{id}/heartbeat.",
          "Keep response / response board store bodies for the Responses page and the per-job grid.",
        ],
      },
      {
        type: "p",
        text: "On the job page, actions sit under the title: Run, Timing (skip / snooze / once), and Job (pause, duplicate, move, delete). The kebab on the jobs list stays visible so overflow menus are not clipped.",
      },
    ],
  },
  {
    id: "types",
    title: "Job types",
    kicker: "Core",
    blocks: [
      {
        type: "ul",
        items: [
          "HTTP — request the URL. Fail on network error, timeout, assertion miss, or unexpected status.",
          "HEARTBEAT — the worker expects a ping. If lastHeartbeatAt goes stale, a missed-beat alert fires. Use this for external cron that should check in.",
          "WEBHOOK — wait for POST/GET on the inbound hook URL instead of (or in addition to) the schedule. HMAC can be GitHub or GitLab.",
          "TCP — connect to host:port. Useful for databases, SMTP, or custom ports.",
          "DNS — resolve the name and optionally assert an expected record (assertEquals).",
          "TLS — fetch the certificate and fail if remaining days are below assertStatus (default 14 in the template).",
          "DOMAIN — RDAP/WHOIS style expiry check. Fail if remaining days are below assertStatus.",
        ],
      },
    ],
  },
  {
    id: "runs",
    title: "Runs, responses, and inbox",
    kicker: "Ops",
    blocks: [
      {
        type: "p",
        text: "Every execution writes a JobRun: status (PENDING, RUNNING, SUCCESS, FAILED, TIMEOUT, BLOCKED), trigger (SCHEDULE, MANUAL, RETRY, ONCE), timings (dns, connect, TTFB, duration), HTTP status, optional body, and error. BLOCKED means SSRF, private host, or a missing secret.",
      },
      {
        type: "ul",
        items: [
          "Retries: retryMax plus retryDelaySec. Notifications wait until retries are exhausted.",
          "Responses: jobs with keepResponse or responseBoard store bodies. The grid can freeze columns, watch cells, save views, and chart a numeric column.",
          "Inbox: failing jobs that are not acknowledged. Ack from the job, an email link, Telegram/Slack bots, or the API. A newer failure reopens it.",
          "Incidents: opened on the first fail, closed on the first success. Assignee email and notes live on the job.",
        ],
      },
    ],
  },
  {
    id: "timing",
    title: "Timing, maintenance, and calendar",
    kicker: "Ops",
    blocks: [
      {
        type: "ul",
        items: [
          "Skip next fire advances nextRunAt past the upcoming slot. Paused jobs have nothing to skip.",
          "Snooze (1 / 2 / 8 / 24 hours) delays fires and keeps alerts quiet until then.",
          "Once-off queues a single ONCE trigger at an ISO timestamp without changing the cron.",
          "Workspace maintenance window (and per-group windows) can mute alerts or skip fires. Mute-only still runs the job.",
          "Quiet hours on notifications still allow critical events you list (fails, timeouts, missed beats, and so on).",
          "Calendar page and GET /api/v1/calendar emit an iCal of the next week, honoring holidays, weekends, hours, and snooze.",
        ],
      },
    ],
  },
  {
    id: "notify",
    title: "Notifications",
    kicker: "Workspace",
    blocks: [
      {
        type: "p",
        text: "Workspace defaults apply to new jobs. Each job has its own matrix of events × channels. Events: failure, timeout, blocked, success, recovery, pause, missed, slow, escalate, watch, SLO.",
      },
      {
        type: "ul",
        items: [
          "Email — workspace SMTP plus notify addresses. Escalation email after N consecutive failures. Daily digest at digestHour.",
          "Telegram — bot token, one or more chat ids, getMe, discover chats, set/clear webhook. Per-job templates with {{job}}, {{status}}, {{error}}, {{ackUrl}}, and a free-text note.",
          "Slack and Discord — incoming webhook URLs. Slack commands share the same signing secret family as the bot dispatcher.",
          "SMS — HTTP gateway URL, user/pass, from, and a phone list.",
          "Job webhooks — per-job notifyUrl. Signed with X-SoftifyCron-Signature (HMAC-SHA256 of timestamp.body) and X-SoftifyCron-Timestamp.",
          "Workspace API events — optional apiEventUrl. Every finished run (not mid-retry) POSTs type job.run.finished with the same signature headers.",
          "Push — browser push from the app. Cooldown, on-call roster, and event mutes (hours) cut noise.",
        ],
      },
      {
        type: "note",
        text: "Rotate the signing secret from Notifications → Job webhooks. The new secret is shown once. Verify with HMAC-SHA256(secret, `${timestamp}.${rawBody}`).",
      },
    ],
  },
  {
    id: "people",
    title: "People, roles, and security",
    kicker: "Workspace",
    blocks: [
      {
        type: "ul",
        items: [
          "People: invite by email, attach an existing login, or create a user. Roles are OWNER, ADMIN, MEMBER, plus custom TenantRole keys.",
          "Permissions: jobs.view / run / edit / delete, runs.view, secrets.manage, people.view / manage, settings.edit. Members can receive extra grants.",
          "Secrets: named {{SECRET:key}} values, encrypted at rest. Export never includes plaintext values.",
          "Security: password change, TOTP, session epoch (password change signs everyone out), optional login IP allow-list.",
          "API tokens: sc_… secrets, optional expiry, scopes. Legacy tokens with empty scopes keep full access.",
          "Client portal: Settings → Security. Create a client, bind job groups, copy the one-time /portal/pt_… URL or email a 24-hour login. Rotate if the link is lost (that kills the old URL). Jobs without a group never appear.",
        ],
      },
    ],
  },
  {
    id: "portal",
    title: "Client portal",
    kicker: "Customers",
    blocks: [
      {
        type: "p",
        text: "Give each customer a read-only portal of their job groups. This is not the workspace-wide token under Notifications. Create clients in Settings → Security.",
      },
      {
        type: "ul",
        items: [
          "Magic link /portal/pt_… is bound to one or more job groups. Opening it sets an httpOnly cookie and redirects to /portal so the secret does not stay in the address bar.",
          "Rotate, edit groups/email/logo, or revoke from Settings → Security. Rotate bumps the session epoch and signs existing cookies out. Email link needs workspace SMTP.",
          "Optional emails receive a 24-hour login link from /portal/login. The form never says whether the mailbox exists.",
          "Home: health (healthy / failing / never run), open incidents, upcoming fires, 30-day run success rate, and the status-page logo. No URLs, headers, bodies, or secrets.",
          "Job card: name, type, armed/paused, last/next run, last N runs with status and duration only. No Run now, no edit.",
          "Clients can ack with “I saw it” plus a note. That writes the same ack Inbox and the job page already show.",
          "Monthly report downloads CSV or PDF from the same numbers as /api/reports/month, scoped to the client’s jobs.",
        ],
      },
      {
        type: "note",
        text: "The legacy workspace-wide portal token under Notifications is hidden once you have a per-client portal. Prefer per-client links.",
      },
    ],
  },
  {
    id: "platform",
    title: "Platform admin",
    kicker: "Platform",
    blocks: [
      {
        type: "p",
        text: "SUPERADMIN users see Tenants and Monitor. They can create workspaces, attach owners, inspect every tenant’s jobs, set caps (jobs / runs per month), and read the platform audit. Monitor is the cross-tenant health board. Customers never see this group.",
      },
    ],
  },
  {
    id: "api",
    title: "Public API",
    kicker: "Integrations",
    blocks: [
      {
        type: "p",
        text: "Base path /api/v1. Send Authorization: Bearer sc_…. Cookie sessions from the signed-in app also work, mapped from UI permissions. CORS is open so browsers and no-code tools can call it. GET /api/v1/openapi is the machine spec (no auth).",
      },
      {
        type: "ul",
        items: [
          "jobs.read — list/get jobs, groups, incidents, calendar.",
          "jobs.write — create/update/pause/skip/snooze/mute/duplicate/once/bulk (except delete and run).",
          "jobs.run — run now, heartbeat, acknowledge.",
          "jobs.delete — delete a job or bulk delete.",
          "runs.read — list and get runs. Add ?include=body for the stored body.",
        ],
      },
      {
        type: "ol",
        items: [
          "Create a token under Settings → Security. Copy it once.",
          "GET /api/v1/me to confirm workspace and scopes.",
          "GET /api/v1/jobs to list, POST /api/v1/jobs to create, POST /api/v1/jobs/{id}/run to fire.",
          "Subscribe your system to the workspace API event URL for every finished run, or to each job’s notifyUrl for filtered events.",
        ],
      },
      {
        type: "note",
        text: "Hook token hashes, golden bodies, and auth bodies are never returned. Job list pagination uses take (max 200) and skip. Errors are { error, code } with 401 unauthorized, 403 forbidden, 404 not_found, 422 invalid_input.",
      },
    ],
  },
  {
    id: "hooks",
    title: "Inbound hooks and heartbeats",
    kicker: "Integrations",
    blocks: [
      {
        type: "ul",
        items: [
          "Inbound: GET or POST /api/hooks/{token} runs the job as MANUAL. GitHub mode checks X-Hub-Signature-256. GitLab mode checks X-Gitlab-Token against the hook token.",
          "Heartbeat: GET or POST /api/v1/jobs/{id}/heartbeat with a Bearer token. Missed-beat logic uses lastHeartbeatAt versus the job schedule.",
          "Email ack: signed /api/ack/{token} marks the incident acknowledged without logging in.",
        ],
      },
    ],
  },
  {
    id: "backup",
    title: "Backup, appearance, and worker",
    kicker: "Workspace",
    blocks: [
      {
        type: "ul",
        items: [
          "Workspace → Backup exports jobs/groups JSON (no secret values). Import creates paused copies. Full workspace export is also available.",
          "Appearance: dark / light / system and comfortable / compact. Preference is stored in cookies so the first paint matches.",
          "The worker process (tsx src/worker/index.ts) must stay running. Home shows last heartbeat. Plesk startup should run server.js after deploy (prisma generate && prisma migrate deploy && next build).",
          "Retention: runRetentionDays and bodyKeepLast prune old runs. maxConcurrent caps in-flight jobs per workspace. catchUpMissed can run overdue slots.",
        ],
      },
    ],
  },
];

export function searchDocSections(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return APP_DOC_SECTIONS;
  return APP_DOC_SECTIONS.filter((section) => {
    const hay = [
      section.title,
      section.kicker,
      ...section.blocks.flatMap((block) => {
        if (block.type === "p" || block.type === "note") return [block.text];
        return block.items;
      }),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
