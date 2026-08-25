import Link from "next/link";
import { unsubscribeStatus } from "@/lib/status-subscribers";
import { Logo } from "@/components/logo";

export const metadata = { title: "Unsubscribe" };

export default async function StatusUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token?.trim() ?? "";
  const ok = token ? await unsubscribeStatus(token) : false;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <Logo />
      <h1 className="mt-8 font-display text-4xl">{ok ? "Unsubscribed" : "Already gone"}</h1>
      <p className="mt-3 text-ink-dim">
        {ok
          ? "You will no longer receive status emails for this page."
          : "This unsubscribe link is missing or was already used."}
      </p>
      <Link href="/" className="btn btn-gold mt-6">
        Home
      </Link>
    </main>
  );
}
