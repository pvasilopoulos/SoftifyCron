import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    title: "Tenant walls",
    copy: "Platform admins see every customer. A customer login is locked to one tenant — jobs, runs, and secrets never leak across organizations.",
  },
  {
    title: "Groups, types, tags",
    copy: "Folder jobs into Ops, Billing, or your own groups. Mark them HTTP, heartbeat, or webhook and filter the board instantly.",
  },
  {
    title: "Retries and secrets",
    copy: "Failed runs retry on a delay, notify a webhook, and interpolate {{SECRET:KEY}} from encrypted tenant secrets.",
  },
  {
    title: "Built for your phone",
    copy: "Bottom navigation, 44px targets, and card layouts so you can pause a failing job from the train.",
  },
  {
    title: "Dark, light, and auto",
    copy: "Mint on night or forest on paper. Theme stays on this device, compact density tightens the board, and ⌘K jumps to any job.",
  },
];

export default function HomePage() {
  return (
    <div className="relative z-10 overflow-x-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <ThemeToggle compact />
          <Link href="/login" className="btn btn-ghost px-3 text-sm">
            Sign in
          </Link>
          <Link href="/register" className="btn btn-gold px-3 text-sm">
            Start
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">
          Multi-tenant control plane
        </p>
        <h1 className="mt-5 max-w-4xl font-display text-[2.6rem] leading-[1.05] tracking-tight sm:text-7xl">
          Scheduled work,{" "}
          <span className="italic text-gold-2">isolated per tenant.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ink-dim sm:text-lg sm:leading-8">
          SoftifyCron is a modern workspace for HTTP cron jobs. Register an
          organization, invite teammates, and manage schedules that cannot see
          another tenant&apos;s queue.
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
          Platform admin · <span className="mono text-ink">admin@softifycron.dev</span> /{" "}
          <span className="mono text-ink">Admin1234!</span>
        </p>
        <p className="mt-1 text-sm text-ink-dim">
          Customer · <span className="mono text-ink">demo@softifycron.dev</span> /{" "}
          <span className="mono text-ink">Demo1234!</span>
        </p>

        <section className="mt-14 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-5 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-dim">
              Upcoming in Aurora Studio
            </p>
            <div className="mt-6 space-y-4">
              {[
                ["Status page ping", "HEARTBEAT · Ops", "in 4 min"],
                ["Morning digest", "WEBHOOK · Billing", "tomorrow 09:00"],
                ["Paused backup probe", "HTTP · Integrations", "paused"],
              ].map(([name, cron, eta]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-4 border-b border-line pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="mt-1 text-xs text-ink-dim">{cron}</p>
                  </div>
                  <span className="rounded-full bg-gold/10 px-3 py-1 text-xs text-gold-2">
                    {eta}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-dim">
              Phone-ready
            </p>
            <p className="mt-5 font-display text-5xl italic text-sage">Home</p>
            <p className="mt-2 text-sm text-ink-dim">
              Failing jobs sit on the dashboard. Search, bulk pause, and run
              history all work on a 390px screen.
            </p>
            <div className="mt-6 grid grid-cols-4 gap-2 text-center text-[11px] text-ink-dim">
              {["Home", "Jobs", "Runs", "More"].map((label) => (
                <div key={label} className="rounded-2xl bg-bg px-2 py-3">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="card card-hover p-6">
              <h2 className="font-display text-2xl italic">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink-dim">{feature.copy}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
