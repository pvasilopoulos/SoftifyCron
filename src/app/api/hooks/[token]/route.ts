import { NextResponse } from "next/server";
import { hashToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { executeJobById } from "@/lib/runner";
import { writeAudit } from "@/lib/audit";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  return fire(context);
}

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  return fire(context);
}

async function fire(context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const raw = decodeURIComponent(token ?? "").trim();
  if (!raw) return NextResponse.json({ ok: false }, { status: 404 });
  const job = await prisma.cronJob.findFirst({
    where: { hookTokenHash: hashToken(raw) },
    select: { id: true, tenantId: true, name: true },
  });
  if (!job) return NextResponse.json({ ok: false }, { status: 404 });
  const run = await executeJobById(job.id, "MANUAL");
  await writeAudit({
    tenantId: job.tenantId,
    action: "job.hook",
    target: job.id,
    meta: job.name,
  });
  return NextResponse.json({ ok: true, runId: run?.runId ?? null });
}
