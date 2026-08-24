import Link from "next/link";
import { Logo } from "@/components/logo";

const FEATURES = [
  {
    title: "Tenant walls",
    copy: "Every query is scoped to the workspace in the session. Jobs, runs, and settings never leak across organizations.",
  },
  {
    title: "MySQL as source of truth",
    copy: "Tenants, members, cron definitions, and execution history live in MySQL. The worker claims due rows instead of keeping schedules in memory.",
  },
  {
    title: "HTTP jobs you can steer",
    copy: "Create, pause, edit, and fire webhooks with cron expressions, timezones, headers, and a full run log.",
  },
];

export default function HomePage() {
  return (
    <div className="relative z-10 overflow-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/register" className="btn btn-gold">
            Create workspace
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">
          Multi-tenant control plane
        </p>
        <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
          Scheduled work,{" "}
          <span className="italic text-gold-2">isolated per tenant.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-dim">
          SoftifyCron is a modern workspace for HTTP cron jobs. Register an
          organization, invite nobody else if you do not want to, and manage
          schedules that cannot see another tenant&apos;s queue.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="btn btn-gold">
            Open a tenant
          </Link>
          <Link href="/login" className="btn btn-ghost">
            Use the demo account
          </Link>
        </div>
        <p className="mt-4 text-sm text-ink-dim">
          Demo · <span className="mono text-ink">demo@softifycron.dev</span> /{" "}
          <span className="mono text-ink">Demo1234!</span>
        </p>

        <section className="mt-16 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-dim">
              Upcoming in Aurora Studio
            </p>
            <div className="mt-6 space-y-4">
              {[
                ["Status page ping", "*/15 * * * *", "in 4 min"],
                ["Morning digest", "0 9 * * 1-5", "tomorrow 09:00"],
                ["Paused backup probe", "0 3 * * *", "paused"],
              ].map(([name, cron, eta]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-4 border-b border-line pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="mono mt-1 text-xs text-ink-dim">{cron}</p>
                  </div>
                  <span className="rounded-full bg-gold/10 px-3 py-1 text-xs text-gold-2">
                    {eta}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-dim">
              Last execution
            </p>
            <p className="mt-5 font-display text-5xl italic text-sage">200</p>
            <p className="mt-2 text-sm text-ink-dim">
              GET example.com · 184ms · tenant-scoped run row written to MySQL
            </p>
            <pre className="mono mt-6 overflow-x-auto rounded-2xl bg-bg p-4 text-xs text-gold-2">
{`INSERT INTO JobRun
  (tenantId, jobId, status)
VALUES
  (?, ?, 'SUCCESS');`}
            </pre>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="card p-6">
              <h2 className="font-display text-2xl italic">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink-dim">{feature.copy}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
