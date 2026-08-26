const FAILING = new Set(["FAILED", "TIMEOUT", "BLOCKED"]);

export type InboxJob = {
  id: string;
  name: string;
  lastStatus: string | null;
  lastRunAt: Date | string | null;
  ackedAt: Date | string | null;
  consecutiveFailures: number;
};

export function isOpenIncident(job: InboxJob, now = new Date()) {
  if (!job.lastStatus || !FAILING.has(job.lastStatus)) return false;
  if (job.ackedAt) {
    const acked = new Date(job.ackedAt).getTime();
    const last = job.lastRunAt ? new Date(job.lastRunAt).getTime() : 0;
    if (Number.isFinite(acked) && acked >= last) return false;
  }
  void now;
  return true;
}

export function sortInbox(jobs: InboxJob[]) {
  return [...jobs].filter((job) => isOpenIncident(job)).sort((left, right) => {
    const fails = (right.consecutiveFailures ?? 0) - (left.consecutiveFailures ?? 0);
    if (fails) return fails;
    const lt = left.lastRunAt ? new Date(left.lastRunAt).getTime() : 0;
    const rt = right.lastRunAt ? new Date(right.lastRunAt).getTime() : 0;
    return rt - lt;
  });
}
