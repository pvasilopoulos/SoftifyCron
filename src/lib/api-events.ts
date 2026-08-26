import { prisma } from "@/lib/prisma";
import { assertSafeUrl } from "@/lib/ssrf";
import { webhookSignatureHeader } from "@/lib/notify-sign";
import { ensureWebhookSecret } from "@/lib/tenant-notify";

export type ApiRunEvent = {
  jobId: string;
  jobName: string;
  jobType: string;
  runId: string;
  status: string;
  trigger: string;
  httpStatus: number | null;
  durationMs: number | null;
  error: string | null;
};

export async function emitApiRunEvent(tenantId: string, event: ApiRunEvent) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      apiEventUrl: true,
      webhookSignEnc: true,
    },
  });
  const url = tenant?.apiEventUrl?.trim();
  if (!tenant || !url) return;
  try {
    await assertSafeUrl(url);
    const body = JSON.stringify({
      id: `evt_${event.runId}`,
      type: "job.run.finished",
      createdAt: new Date().toISOString(),
      workspace: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      job: { id: event.jobId, name: event.jobName, type: event.jobType },
      run: {
        id: event.runId,
        status: event.status,
        trigger: event.trigger,
        httpStatus: event.httpStatus,
        durationMs: event.durationMs,
        error: event.error,
      },
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const secret = await ensureWebhookSecret(tenant.id, tenant.webhookSignEnc);
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "SoftifyCron/1.0",
        "x-softifycron-event": "job.run.finished",
        "x-softifycron-timestamp": timestamp,
        "x-softifycron-signature": webhookSignatureHeader(secret, timestamp, body),
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error("[api-event] delivery failed", tenantId, error);
  }
}
