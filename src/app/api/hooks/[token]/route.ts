import { NextResponse } from "next/server";
import { hashToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { executeJobById } from "@/lib/runner";
import { writeAudit } from "@/lib/audit";
import { parseHookHmac, verifyGithubSignature, verifyGitlabToken } from "@/lib/hook-hmac";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  return fire(request, context, "");
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const raw = await request.text();
  return fire(request, context, raw);
}

async function fire(request: Request, context: { params: Promise<{ token: string }> }, rawBody: string) {
  const { token } = await context.params;
  const raw = decodeURIComponent(token ?? "").trim();
  if (!raw) return NextResponse.json({ ok: false }, { status: 404 });
  const job = await prisma.cronJob.findFirst({
    where: { hookTokenHash: hashToken(raw) },
    select: { id: true, tenantId: true, name: true, hookHmac: true },
  });
  if (!job) return NextResponse.json({ ok: false }, { status: 404 });
  const mode = parseHookHmac(job.hookHmac);
  if (mode === "github") {
    if (request.method !== "POST" || !verifyGithubSignature(raw, rawBody, request.headers.get("x-hub-signature-256"))) {
      return NextResponse.json({ ok: false, error: "Invalid GitHub signature" }, { status: 401 });
    }
  }
  if (mode === "gitlab") {
    if (!verifyGitlabToken(raw, request.headers.get("x-gitlab-token"))) {
      return NextResponse.json({ ok: false, error: "Invalid GitLab token" }, { status: 401 });
    }
  }
  const run = await executeJobById(job.id, "MANUAL");
  await writeAudit({
    tenantId: job.tenantId,
    action: "job.hook",
    target: job.id,
    meta: job.name,
  });
  return NextResponse.json({ ok: true, runId: run?.runId ?? null });
}
