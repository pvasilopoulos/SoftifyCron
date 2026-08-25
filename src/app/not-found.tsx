import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">404</p>
      <h1 className="mt-3 font-display text-4xl">Not in this tenant</h1>
      <p className="mt-3 max-w-md text-ink-dim">
        That record is missing, or it belongs to another workspace.
      </p>
      <Link href="/dashboard" className="btn btn-gold mt-6">
        Back to overview
      </Link>
    </div>
  );
}
