import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getJobForTenant, listJobOptions, listJobRevisions } from "@/lib/jobs";
import { describeCron, previewRuns } from "@/lib/cron";
import { formatAbsolute, formatDateTime, formatDuration } from "@/lib/format";
import { RelativeTime } from "@/components/relative-time";
import { prisma } from "@/lib/prisma";
import { JobActions } from "@/components/job-actions";
import { StatusPill } from "@/components/status-pill";
import { jobAccess } from "@/lib/acl";
import { buildCurl } from "@/lib/curl";
import { listTenantOptions } from "@/lib/admin";
import { MoveJobForm } from "@/components/move-job-form";
import { summarizeNotify, NOTIFY_EVENT_LABELS } from "@/lib/notify-events";
import { jobHeartbeatUrl } from "@/lib/app-url";
import { JobChainMap } from "@/components/job-chain-map";
import { JobHistory } from "@/components/job-history";
import { Sparkline } from "@/components/sparkline";
import { weekSparks } from "@/lib/spark-data";
import { JobHookCard } from "@/components/job-hook-card";
import { OpsJobPanel } from "@/components/ops-job-panel";
import { whyNotFired } from "@/lib/why-skipped";
import { flapLabel } from "@/lib/flap";
import { maintAction, maintFromRow } from "@/lib/maintenance";

export const metadata = { title: "Job" };

function channelLabel(channel: string) {
  const labels: Record<string, string> = {
    email: "Email",
    telegram: "Telegram",
    slack: "Slack",
    discord: "Discord",
    sms: "SMS",
    webhook: "Webhook",
    push: "Push",
  };
  return labels[channel] ?? channel;
}

function httpTone(status: number | null | undefined) {
  if (status == null) return "";
  if (status >= 200 && status < 400) return "is-ok";
  if (status >= 400) return "is-bad";
  return "";
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const job = await getJobForTenant(session.tid, id);
  if (!job) notFound();
  const access = jobAccess(session);

  const [runs, tenants, deliveries, peers, revisions, sparkMap, tenant, parent, monthRuns] = await Promise.all([
    prisma.jobRun.findMany({
      where: { tenantId: session.tid, jobId: job.id },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    session.platform ? listTenantOptions() : Promise.resolve([]),
    prisma.notifyDelivery.findMany({
      where: { tenantId: session.tid, jobId: job.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    listJobOptions(session.tid),
    listJobRevisions(session.tid, job.id, 12),
    weekSparks(session.tid, [job.id], 7, job.timezone),
    prisma.tenant.findUnique({ where: { id: session.tid } }),
    job.dependsOnJobId
      ? prisma.cronJob.findFirst({
          where: { id: job.dependsOnJobId, tenantId: session.tid },
          select: { lastStatus: true },
        })
      : Promise.resolve(null),
    prisma.jobRun.count({
      where: {
        tenantId: session.tid,
        startedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);
  const spark = sparkMap.get(job.id);
  const maint = maintAction(new Date(), job.timezone, maintFromRow(tenant), maintFromRow(job.group));
  const skipped = whyNotFired({
    enabled: job.enabled,
    cronExpr: job.cronExpr,
    timezone: job.timezone,
    nextRunAt: job.nextRunAt,
    lockedUntil: job.lockedUntil,
    dependsOnJobId: job.dependsOnJobId,
    parentLastStatus: parent?.lastStatus,
    schedule: { ...job, maintSkip: maint.skip },
    tenantHolidays: Boolean(tenant?.skipGreekHolidays),
    capJobs: tenant?.capJobs,
    capRunsMonth: tenant?.capRunsMonth,
    jobs: await prisma.cronJob.count({ where: { tenantId: session.tid } }),
    runsMonth: monthRuns,
  });

  let upcoming: Date[] = [];
  try {
    upcoming = job.enabled ? previewRuns(job.cronExpr, job.timezone, 5) : [];
  } catch {
    upcoming = [];
  }

  const headers =
    job.headers && typeof job.headers === "object"
      ? JSON.stringify(job.headers, null, 2)
      : "—";
  const tags = job.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const notifyRows = summarizeNotify(job);

  return (
    <div className="space-y-8">
      <header className="job-hero">
        <div className="job-hero-id">
          <Link href="/jobs" className="text-xs uppercase tracking-[0.16em] text-ink-dim">
            ← Jobs
          </Link>
          <h1 className="job-hero-title font-display">{job.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-dim sm:text-base">
            {job.description || describeCron(job.cronExpr)}
          </p>
          {job.notes ? (
            <p className="mt-3 max-w-2xl rounded-2xl bg-bg-mute px-3 py-2 text-sm">{job.notes}</p>
          ) : null}
          {job.ackedAt && job.lastStatus && job.lastStatus !== "SUCCESS" && (!job.lastRunAt || job.ackedAt >= job.lastRunAt) ? (
            <p className="mt-3 text-sm text-ink-dim">
              Acknowledged by {job.ackedBy ?? "someone"}
              {job.ackNote ? ` · ${job.ackNote}` : ""}
            </p>
          ) : null}
          <div className="job-hero-meta">
            <span
              className="job-chip"
              style={{
                background: `${job.group?.color ?? "#8b93a7"}22`,
                color: job.group?.color ?? "#8b93a7",
              }}
            >
              {job.group?.name ?? "Ungrouped"}
            </span>
            <span className="job-chip">{job.type}</span>
            {tags.map((tag) => (
              <span key={tag} className="job-chip job-chip-dim">
                {tag}
              </span>
            ))}
            {job.lastStatus ? <StatusPill status={job.lastStatus} /> : null}
            <Sparkline days={spark} />
            {job.flapScore > 0 ? (
              <span className="job-chip job-chip-dim">
                {flapLabel(job.flapScore)} · {job.flapScore}
              </span>
            ) : null}
            {job.configLocked ? <span className="job-chip job-chip-dim">Locked</span> : null}
            {job.responseBoard ? (
              <Link href={`/responses?job=${job.id}`} className="job-chip text-gold-2">
                Response board
              </Link>
            ) : job.keepResponse ? (
              <Link href={`/jobs/${job.id}/response`} className="job-chip text-gold-2">
                View response
              </Link>
            ) : null}
          </div>
        </div>
        <JobActions
          jobId={job.id}
          name={job.name}
          enabled={job.enabled}
          access={access}
          curl={buildCurl(job)}
          lastStatus={job.lastStatus}
          onceAt={job.onceAt?.toISOString() ?? null}
          editHref={access.edit ? `/jobs/${job.id}/edit` : null}
        />
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-gold">Target</p>
              <p className="mt-1 text-sm text-ink-dim">{describeCron(job.cronExpr)}</p>
            </div>
            <span className={job.enabled ? "job-chip text-sage" : "job-chip job-chip-dim"}>
              {job.enabled ? "Armed" : "Paused"}
            </span>
          </div>
          <div className="job-url">
            <span className="job-url-method mono">{job.method}</span>
            <span className="job-url-path mono break-all">{job.url}</span>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="job-stat">
              <dt>Next run</dt>
              <dd>
                <RelativeTime value={job.nextRunAt} timeZone={job.timezone} />
                <span className="mt-1 block text-xs font-medium text-ink-dim">
                  {formatDateTime(job.nextRunAt, job.timezone)}
                </span>
              </dd>
            </div>
            <div className="job-stat">
              <dt>Schedule</dt>
              <dd>
                <span className="mono">{job.cronExpr}</span>
                <span className="mt-1 block text-xs font-medium text-ink-dim">{job.timezone}</span>
              </dd>
            </div>
            <div className="job-stat">
              <dt>Timeout / retries</dt>
              <dd>
                {formatDuration(job.timeoutMs)}
                <span className="mt-1 block text-xs font-medium text-ink-dim">
                  {job.retryMax} × {job.retryDelaySec}s
                </span>
              </dd>
            </div>
            <div className="job-stat">
              <dt>Failures</dt>
              <dd>
                {job.consecutiveFailures}
                <span className="mt-1 block text-xs font-medium text-ink-dim">
                  {job.pauseAfter > 0 ? `Auto-pause at ${job.pauseAfter}` : "No auto-pause"}
                </span>
              </dd>
            </div>
            {job.snoozeUntil ? (
              <div className="job-stat">
                <dt>Snoozed until</dt>
                <dd>
                  <RelativeTime value={job.snoozeUntil} timeZone={job.timezone} />
                  <span className="mt-1 block text-xs font-medium text-ink-dim">
                    {formatDateTime(job.snoozeUntil, job.timezone)}
                  </span>
                </dd>
              </div>
            ) : null}
            {job.onceAt ? (
              <div className="job-stat">
                <dt>Once-off</dt>
                <dd>
                  <RelativeTime value={job.onceAt} timeZone={job.timezone} />
                  <span className="mt-1 block text-xs font-medium text-ink-dim">
                    {formatDateTime(job.onceAt, job.timezone)}
                  </span>
                </dd>
              </div>
            ) : null}
            {job.sloFailPerDay > 0 ? (
              <div className="job-stat">
                <dt>SLO</dt>
                <dd>
                  {job.sloFailPerDay} fails / 24h
                  <span className="mt-1 block text-xs font-medium text-ink-dim">Alert when the budget breaks</span>
                </dd>
              </div>
            ) : null}
            {job.followUpJobId || job.dependsOnJobId ? (
              <div className="job-stat">
                <dt>Chain</dt>
                <dd className="font-medium text-ink">
                  {job.followUpJobId ? "Follow-up set" : null}
                  {job.followUpJobId && job.dependsOnJobId ? " · " : ""}
                  {job.dependsOnJobId ? "Depends on another job" : null}
                </dd>
              </div>
            ) : null}
            {job.assertStatus > 0 || job.assertJsonPath || job.assertContains ? (
              <div className="job-stat sm:col-span-2">
                <dt>Assertions</dt>
                <dd className="font-medium text-ink">
                  {job.assertStatus > 0 ? `HTTP ${job.assertStatus}` : ""}
                  {job.assertJsonPath ? ` · ${job.assertJsonPath}${job.assertEquals ? ` = ${job.assertEquals}` : ""}` : ""}
                  {job.assertContains ? ` · contains “${job.assertContains}”` : ""}
                </dd>
              </div>
            ) : null}
            {job.skipHolidays || job.skipWeekends || job.activeHoursStart || job.slowAfterMs > 0 ? (
              <div className="job-stat sm:col-span-2">
                <dt>Windows</dt>
                <dd className="font-medium text-ink">
                  {job.skipHolidays ? "Skip Greek holidays" : ""}
                  {job.skipWeekends ? `${job.skipHolidays ? " · " : ""}Skip weekends` : ""}
                  {job.activeHoursStart && job.activeHoursEnd
                    ? `${job.skipHolidays || job.skipWeekends ? " · " : ""}${job.activeHoursStart}–${job.activeHoursEnd}`
                    : ""}
                  {job.slowAfterMs > 0
                    ? `${job.skipHolidays || job.skipWeekends || job.activeHoursStart ? " · " : ""}slow after ${job.slowAfterMs}ms`
                    : ""}
                </dd>
              </div>
            ) : null}
            {job.type === "HEARTBEAT" ? (
              <div className="job-stat sm:col-span-2">
                <dt>Last heartbeat</dt>
                <dd>
                  <RelativeTime value={job.lastHeartbeatAt} timeZone={job.timezone} />
                  <span className="mono mt-1 block break-all text-xs font-medium text-ink-dim">
                    {jobHeartbeatUrl(job.id)}
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-6">
            <p className="field-label">Notifications</p>
            {notifyRows.length === 0 ? (
              <p className="text-sm text-ink-dim">No events selected.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {notifyRows.map((row) => (
                  <li key={row.event} className="job-chip">
                    {NOTIFY_EVENT_LABELS[row.event].title}
                    <span className="job-chip-dim">{row.channels.map(channelLabel).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            )}
            {job.notifyUrl ? (
              <p className="mono mt-2 break-all text-xs text-ink-dim">{job.notifyUrl}</p>
            ) : null}
            <p className="mt-2 text-xs text-ink-dim">
              Telegram: {job.telegramTemplate?.name ?? "built-in default"}
              {job.telegramNote ? " · note set" : ""}
            </p>
          </div>
          {headers !== "—" ? (
            <div className="mt-6">
              <p className="field-label">Request headers</p>
              <pre className="mono overflow-x-auto rounded-2xl bg-bg p-4 text-xs text-gold-2">{headers}</pre>
            </div>
          ) : null}
        </div>
        <div className="card p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Upcoming</p>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-ink-dim">Paused — nothing is queued.</p>
          ) : (
            <ol className="upcoming-line mt-4 text-sm">
              {upcoming.map((date) => (
                <li key={date.toISOString()} className="flex items-baseline justify-between gap-3">
                  <span className="mono text-ink">{formatAbsolute(date, job.timezone)}</span>
                  <span className="shrink-0 text-ink-dim">
                    <RelativeTime value={date} timeZone={job.timezone} />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <JobHookCard jobId={job.id} prefix={job.hookTokenPrefix} canEdit={access.edit} />

      <section className="card p-5">
        <h2 className="font-display text-2xl">Why didn’t this fire?</h2>
        <p className="mt-2 text-sm text-ink-dim">
          {skipped.length ? skipped.join(" · ") : "No skip reasons right now. If it is late, the worker may be busy."}
        </p>
        <div className="mt-4">
          <OpsJobPanel
            jobId={job.id}
            assigneeEmail={job.assigneeEmail}
            hasGolden={Boolean(job.goldenBody)}
            canEdit={access.edit}
          />
        </div>
      </section>

      <JobChainMap jobs={peers} focusId={job.id} />

      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-2xl">Alert log</h2>
            <p className="mt-1 text-sm text-ink-dim">
              {deliveries.length ? "Latest deliveries for this job, including cooldown skips." : "Nothing has been sent yet."}
            </p>
          </div>
        </div>
        {deliveries.length === 0 ? (
          <p className="px-5 py-10 text-sm text-ink-dim sm:px-6">No deliveries yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {deliveries.map((row) => (
              <li key={row.id} className="alert-row">
                <span className={`alert-dot is-${row.status}`} aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium">
                    {channelLabel(row.channel)}
                    <span className="font-normal text-ink-dim"> · {row.event}</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-dim">
                    <RelativeTime value={row.createdAt} timeZone={job.timezone} />
                    {row.detail ? ` · ${row.detail}` : ""}
                  </p>
                </div>
                <span className={`alert-status is-${row.status}`}>{row.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-2xl">Runs</h2>
            <p className="mt-1 text-sm text-ink-dim">
              {runs.length ? `Latest ${runs.length} executions.` : "This job has not fired yet."}
            </p>
          </div>
          <Link href={`/runs?jobId=${job.id}`} className="btn btn-ghost btn-sm">
            All runs
          </Link>
        </div>
        {runs.length === 0 ? (
          <p className="px-6 py-10 text-sm text-ink-dim">No executions yet.</p>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {runs.map((run) => (
                <Link key={run.id} href={`/runs/${run.id}`} className="rounded-2xl border border-line bg-bg p-4">
                  <div className="flex items-center justify-between gap-2">
                    <StatusPill status={run.status} />
                    <span className="job-chip job-chip-dim">{run.trigger.toLowerCase()}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium">
                    <RelativeTime value={run.startedAt} timeZone={job.timezone} />
                  </p>
                  <p className="mono mt-1 text-xs text-ink-dim">
                    {formatAbsolute(run.startedAt, job.timezone)}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className={`mono run-http ${httpTone(run.httpStatus)}`}>
                      {run.httpStatus != null ? `HTTP ${run.httpStatus}` : "HTTP —"}
                    </span>
                    <span className="text-ink-dim">
                      {" "}
                      · {formatDuration(run.durationMs)}
                      {run.ttfbMs != null ? ` · TTFB ${run.ttfbMs}ms` : ""}
                      {run.silent ? " · silent" : ""}
                    </span>
                  </p>
                  {run.comment ? <p className="mt-2 text-xs text-ink-dim">{run.comment}</p> : null}
                </Link>
              ))}
            </div>
            <div className="table-wrap hidden md:block rounded-none border-0">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-bg-mute/70 text-xs uppercase tracking-[0.14em] text-ink-dim">
                  <tr>
                    <th className="px-6 py-3 font-medium">When</th>
                    <th className="px-6 py-3 font-medium">Trigger</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">HTTP</th>
                    <th className="px-6 py-3 font-medium">Duration</th>
                    <th className="px-6 py-3 font-medium">TTFB</th>
                    <th className="px-6 py-3 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="row-hover border-t border-line">
                      <td className="px-6 py-3.5">
                        <Link href={`/runs/${run.id}`} className="font-medium hover:text-gold">
                          <RelativeTime value={run.startedAt} timeZone={job.timezone} />
                        </Link>
                        <p className="mono mt-1 text-xs text-ink-dim">
                          {formatAbsolute(run.startedAt, job.timezone)}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="job-chip job-chip-dim">{run.trigger.toLowerCase()}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusPill status={run.status} />
                      </td>
                      <td className={`px-6 py-3.5 mono run-http ${httpTone(run.httpStatus)}`}>
                        {run.httpStatus ?? "—"}
                      </td>
                      <td className="px-6 py-3.5">{formatDuration(run.durationMs)}</td>
                      <td className="px-6 py-3.5 text-ink-dim">
                        {run.ttfbMs != null ? `${run.ttfbMs}ms` : "—"}
                        {run.silent ? " · silent" : ""}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-ink-dim">{run.comment ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {revisions && revisions.length > 0 ? (
        <JobHistory
          jobId={job.id}
          canRestore={access.edit}
          timeZone={job.timezone}
          revisions={revisions.map((row) => {
            const snap =
              row.snapshot && typeof row.snapshot === "object" ? (row.snapshot as { name?: unknown }) : {};
            return {
              id: row.id,
              actor: row.actor,
              createdAt: row.createdAt.toISOString(),
              name: typeof snap.name === "string" ? snap.name : job.name,
            };
          })}
        />
      ) : null}
      {session.platform && tenants.length > 0 ? (
        <MoveJobForm jobId={job.id} currentTenantId={session.tid} tenants={tenants} />
      ) : null}
    </div>
  );
}
