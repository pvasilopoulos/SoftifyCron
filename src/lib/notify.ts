import { assertSafeUrl } from "@/lib/ssrf";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";

export async function notifyFailure(job: {
  id: string;
  tenantId: string;
  name: string;
  notifyUrl: string | null;
  consecutiveFailures: number;
  lastStatus: string | null;
  error?: string | null;
  paused?: boolean;
}) {
  const payload = {
    event: job.paused ? "job.paused" : "job.failed",
    jobId: job.id,
    tenantId: job.tenantId,
    name: job.name,
    status: job.lastStatus,
    consecutiveFailures: job.consecutiveFailures,
    error: job.error ?? null,
    paused: Boolean(job.paused),
  };

  if (job.notifyUrl) {
    try {
      await assertSafeUrl(job.notifyUrl);
      await fetch(job.notifyUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "SoftifyCron/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      console.error("[notify] webhook failed", job.id, error);
    }
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: job.tenantId },
      select: { notifyEmail: true, name: true },
    });
    if (!tenant?.notifyEmail) return;
    const subject = job.paused
      ? `[SoftifyCron] ${job.name} auto-paused`
      : `[SoftifyCron] ${job.name} failed`;
    await sendMail({
      to: tenant.notifyEmail,
      subject,
      text: [
        `Workspace: ${tenant.name}`,
        `Job: ${job.name}`,
        `Status: ${job.lastStatus ?? "FAILED"}`,
        `Consecutive failures: ${job.consecutiveFailures}`,
        job.paused ? "The job was auto-paused." : null,
        job.error ? `Error: ${job.error}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (error) {
    console.error("[notify] email failed", job.id, error);
  }
}
