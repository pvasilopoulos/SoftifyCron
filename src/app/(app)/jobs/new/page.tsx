import { JobForm } from "@/components/job-form";
import { requireSession } from "@/lib/session";

export const metadata = { title: "New job" };

export default async function NewJobPage() {
  const session = await requireSession();
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Create</p>
        <h1 className="mt-2 font-display text-4xl italic">New job</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          The URL is checked against private/loopback hosts before it is stored.
          The worker will only execute it inside {session.tname}.
        </p>
      </div>
      <JobForm />
    </div>
  );
}
