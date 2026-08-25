import Link from "next/link";
import { jobChain, type ChainJob } from "@/lib/job-chain";

export function JobChainMap({ jobs, focusId }: { jobs: ChainJob[]; focusId: string }) {
  const chain = jobChain(jobs, focusId);
  const hasLinks =
    chain.depends || chain.follow || chain.upstream.length > 0 || chain.downstream.length > 0;
  if (!hasLinks) return null;

  return (
    <section className="card p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-gold">Chain map</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {chain.depends ? (
          <>
            <Link href={`/jobs/${chain.depends.id}`} className="rounded-full bg-bg-mute px-3 py-1 hover:text-gold">
              {chain.depends.name}
            </Link>
            <span className="text-ink-dim">→</span>
          </>
        ) : null}
        <span className="rounded-full bg-gold/15 px-3 py-1 text-gold-2">{chain.focus?.name ?? "This job"}</span>
        {chain.follow ? (
          <>
            <span className="text-ink-dim">→</span>
            <Link href={`/jobs/${chain.follow.id}`} className="rounded-full bg-bg-mute px-3 py-1 hover:text-gold">
              {chain.follow.name}
            </Link>
          </>
        ) : null}
      </div>
      {chain.upstream.length > 0 ? (
        <p className="mt-4 text-sm text-ink-dim">
          Followed by{" "}
          {chain.upstream.map((job, index) => (
            <span key={job.id}>
              {index > 0 ? ", " : ""}
              <Link href={`/jobs/${job.id}`} className="text-ink hover:text-gold">
                {job.name}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
      {chain.downstream.length > 0 ? (
        <p className="mt-2 text-sm text-ink-dim">
          Unlocks{" "}
          {chain.downstream.map((job, index) => (
            <span key={job.id}>
              {index > 0 ? ", " : ""}
              <Link href={`/jobs/${job.id}`} className="text-ink hover:text-gold">
                {job.name}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}
