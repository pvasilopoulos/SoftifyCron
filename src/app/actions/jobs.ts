"use server";

import { redirect } from "next/navigation";
import { requireTenantSession } from "@/lib/session";
import { createJob, updateJob } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validators";
import { canManage } from "@/lib/acl";

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

export async function saveJobAction(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const session = await requireTenantSession();
  if (!canManage(session.role)) return { error: "Members cannot edit jobs" };

  let headers: Record<string, string> | null = null;
  try {
    headers = readHeaders(String(formData.get("headers") ?? ""));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid headers" };
  }

  const parsed = jobInputSchema.safeParse({
    name: formData.get("name"),
    description: String(formData.get("description") ?? "") || null,
    groupId: String(formData.get("groupId") ?? "") || null,
    groupName: String(formData.get("groupName") ?? "") || null,
    type: formData.get("type") || "HTTP",
    tags: String(formData.get("tags") ?? ""),
    cronExpr: formData.get("cronExpr"),
    timezone: formData.get("timezone"),
    method: formData.get("method"),
    url: formData.get("url"),
    headers,
    body: String(formData.get("body") ?? "") || null,
    timeoutMs: Number(formData.get("timeoutMs") ?? 30000),
    retryMax: Number(formData.get("retryMax") ?? 0),
    retryDelaySec: Number(formData.get("retryDelaySec") ?? 60),
    notifyUrl: String(formData.get("notifyUrl") ?? "") || null,
    keepResponse: formData.get("keepResponse") === "on",
    pauseAfter: Number(formData.get("pauseAfter") ?? 0),
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const jobId = String(formData.get("jobId") ?? "");
  let job;
  try {
    job = jobId
      ? await updateJob(session.tid, jobId, parsed.data)
      : await createJob(session.tid, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save job" };
  }
  if (!job) return { error: "Job not found" };
  redirect(`/jobs/${job.id}`);
}
