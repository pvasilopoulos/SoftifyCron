export type ChainJob = {
  id: string;
  name: string;
  followUpJobId?: string | null;
  dependsOnJobId?: string | null;
};

export function jobChain(jobs: ChainJob[], focusId: string) {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const focus = byId.get(focusId) ?? null;
  const depends = focus?.dependsOnJobId ? (byId.get(focus.dependsOnJobId) ?? null) : null;
  const follow = focus?.followUpJobId ? (byId.get(focus.followUpJobId) ?? null) : null;
  const upstream = jobs.filter((job) => job.followUpJobId === focusId);
  const downstream = jobs.filter((job) => job.dependsOnJobId === focusId);
  return { focus, depends, follow, upstream, downstream };
}

export function chainHint(job: ChainJob, names: Map<string, string>) {
  const bits: string[] = [];
  if (job.dependsOnJobId) bits.push(`after ${names.get(job.dependsOnJobId) ?? "job"}`);
  if (job.followUpJobId) bits.push(`then ${names.get(job.followUpJobId) ?? "job"}`);
  return bits.join(" · ");
}
