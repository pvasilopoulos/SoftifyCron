import type { CronJob, Incident, JobGroup, JobRun, JobType, RunStatus } from "@prisma/client";

export function publicJob(
  job: CronJob & { group?: JobGroup | null },
) {
  const {
    hookTokenHash: _hash,
    goldenBody,
    authBody,
    gridViews: _views,
    gridWatches: _watches,
    eventMutes: _mutes,
    headers,
    group,
    ...rest
  } = job;
  void _hash;
  void _views;
  void _watches;
  void _mutes;
  return {
    ...rest,
    headers: asStringMap(headers),
    group: group ? { id: group.id, name: group.name, slug: group.slug, color: group.color } : null,
    hasGoldenBody: Boolean(goldenBody),
    hasAuthBody: Boolean(authBody),
    hookConfigured: Boolean(job.hookTokenPrefix),
  };
}

export function publicRun(
  run: JobRun & { job?: { id: string; name: string; type?: JobType } | null },
  opts?: { includeBody?: boolean },
) {
  const { responseBody, ...rest } = run;
  return {
    ...rest,
    job: run.job ? { id: run.job.id, name: run.job.name, type: run.job.type ?? undefined } : undefined,
    hasBody: Boolean(responseBody),
    responseBody: opts?.includeBody ? responseBody : undefined,
  };
}

export function publicGroup(group: JobGroup & { _count?: { jobs: number } }) {
  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    color: group.color,
    maintEnabled: group.maintEnabled,
    maintStartWd: group.maintStartWd,
    maintStartHm: group.maintStartHm,
    maintEndWd: group.maintEndWd,
    maintEndHm: group.maintEndHm,
    maintMuteOnly: group.maintMuteOnly,
    jobCount: group._count?.jobs ?? undefined,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export function publicIncident(
  incident: Incident & { job?: { id: string; name: string; lastStatus?: RunStatus | null } | null },
) {
  return {
    id: incident.id,
    jobId: incident.jobId,
    openedAt: incident.openedAt,
    closedAt: incident.closedAt,
    openedByRunId: incident.openedByRunId || null,
    closedByRunId: incident.closedByRunId || null,
    assigneeEmail: incident.assigneeEmail,
    note: incident.note,
    open: incident.closedAt == null,
    job: incident.job
      ? { id: incident.job.id, name: incident.job.name, lastStatus: incident.job.lastStatus ?? null }
      : undefined,
  };
}

function asStringMap(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string") out[key] = item;
  }
  return Object.keys(out).length ? out : null;
}

