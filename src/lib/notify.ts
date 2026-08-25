import { assertSafeUrl } from "@/lib/ssrf";

export async function notifyFailure(job: {
  id: string;
  tenantId: string;
  name: string;
  notifyUrl: string | null;
  consecutiveFailures: number;
  lastStatus: string | null;
  error?: string | null;
}) {
  if (!job.notifyUrl) return;
  try {
    await assertSafeUrl(job.notifyUrl);
    await fetch(job.notifyUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "SoftifyCron/1.0",
      },
      body: JSON.stringify({
        event: "job.failed",
        jobId: job.id,
        tenantId: job.tenantId,
        name: job.name,
        status: job.lastStatus,
        consecutiveFailures: job.consecutiveFailures,
        error: job.error ?? null,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error("[notify] failed", job.id, error);
  }
}
