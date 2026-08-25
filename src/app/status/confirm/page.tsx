import Link from "next/link";
import { confirmStatusSubscriber } from "@/lib/status-subscribers";
import { Logo } from "@/components/logo";

export const metadata = { title: "Confirm status alerts" };

export default async function StatusConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token?.trim() ?? "";
  const row = token ? await confirmStatusSubscriber(token) : null;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <Logo />
      <h1 className="mt-8 font-display text-4xl">{row ? "Alerts confirmed" : "Link expired"}</h1>
      <p className="mt-3 text-ink-dim">
        {row
          ? "You will get a daily email while jobs on this status page need attention."
          : "This confirmation link is missing or no longer valid."}
      </p>
      <Link href="/" className="btn btn-gold mt-6">
        Home
      </Link>
    </main>
  );
}
