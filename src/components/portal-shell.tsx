import Link from "next/link";
import { Logo } from "@/components/logo";

export function PortalShell({
  title,
  kicker,
  logoUrl,
  children,
}: {
  title: string;
  kicker: string;
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={title} className="h-10 max-w-[180px] object-contain" />
        ) : (
          <Logo />
        )}
        <form action="/api/portal/logout" method="post">
          <button className="btn btn-ghost btn-sm" type="submit">
            Sign out
          </button>
        </form>
      </div>
      <p className="mt-8 text-xs uppercase tracking-[0.16em] text-gold">{kicker}</p>
      <h1 className="mt-2 font-display text-4xl">{title}</h1>
      <nav className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link className="text-gold" href="/portal">
          Overview
        </Link>
        <Link className="text-gold" href="/portal/report">
          Monthly report
        </Link>
      </nav>
      <div className="mt-8">{children}</div>
      <p className="mt-10 text-center text-xs text-ink-dim">Powered by SoftifyCron · no URLs or secrets</p>
    </main>
  );
}
