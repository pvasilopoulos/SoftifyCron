"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { createJob, updateJob } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validators";

function readHeaders(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Headers must be a JSON object of string values");
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new Error("Header values must be strings");
    }
    out[key] = value;
  }
  return out;
}

function fail(jobId: string, message: string): never {
  const path = jobId ? `/jobs/${jobId}/edit` : "/jobs/new";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function saveJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const session = await requireSession();
  let headers: Record<string, string> | null = null;
  try {
    headers = readHeaders(String(formData.get("headers") ?? ""));
  } catch (error) {
    fail(jobId, error instanceof Error ? error.message : "Invalid headers");
  }

  const parsed = jobInputSchema.safeParse({
    name: formData.get("name"),
    description: String(formData.get("description") ?? "") || null,
    cronExpr: formData.get("cronExpr"),
    timezone: formData.get("timezone"),
    method: formData.get("method"),
    url: formData.get("url"),
    headers,
    body: String(formData.get("body") ?? "") || null,
    timeoutMs: Number(formData.get("timeoutMs") ?? 30000),
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) {
    fail(jobId, parsed.error.issues[0]?.message ?? "Invalid input");
  }

  let job;
  try {
    job = jobId
      ? await updateJob(session.tid, jobId, parsed.data)
      : await createJob(session.tid, parsed.data);
  } catch (error) {
    fail(jobId, error instanceof Error ? error.message : "Could not save job");
  }
  if (!job) fail(jobId, "Job not found");
  redirect(`/jobs/${job.id}`);
}
