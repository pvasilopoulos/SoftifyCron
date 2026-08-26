import { NextResponse } from "next/server";
import { verifyAckToken } from "@/lib/ack-token";
import { ackJob } from "@/lib/jobs";
import { writeAudit } from "@/lib/audit";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const parsed = verifyAckToken(decodeURIComponent(token ?? ""));
  if (!parsed) return NextResponse.json({ ok: false, error: "Invalid or expired ack link" }, { status: 400 });
  const job = await ackJob(parsed.tenantId, parsed.jobId, { name: "email", email: "ack-link" }, "Acked from email");
  if (!job) return NextResponse.json({ ok: false }, { status: 404 });
  await writeAudit({
    tenantId: parsed.tenantId,
    action: "job.ack",
    target: parsed.jobId,
    meta: "email-link",
  });
  return NextResponse.json({ ok: true, job: job.name });
}
