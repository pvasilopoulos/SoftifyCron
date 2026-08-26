"use server";

import { redirect } from "next/navigation";
import { requireTenantSession } from "@/lib/session";
import { createJob, updateJob } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/acl";
import { writeAudit } from "@/lib/audit";

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
  if (!hasPermission(session, "jobs.edit")) return { error: "You cannot edit jobs" };

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
    notifyEmailOn: formData.getAll("notifyEmailOn").map(String),
    notifyTelegramOn: formData.getAll("notifyTelegramOn").map(String),
    notifyWebhookOn: formData.getAll("notifyWebhookOn").map(String),
    notifySlackOn: formData.getAll("notifySlackOn").map(String),
    notifyDiscordOn: formData.getAll("notifyDiscordOn").map(String),
    notifySmsOn: formData.getAll("notifySmsOn").map(String),
    keepResponse: formData.get("keepResponse") === "on" || formData.get("responseBoard") === "on",
    responseBoard: formData.get("responseBoard") === "on",
    pauseAfter: Number(formData.get("pauseAfter") ?? 0),
    enabled: formData.get("enabled") === "on",
    followUpJobId: String(formData.get("followUpJobId") ?? "") || null,
    dependsOnJobId: String(formData.get("dependsOnJobId") ?? "") || null,
    assertStatus: Number(formData.get("assertStatus") ?? 0),
    assertJsonPath: String(formData.get("assertJsonPath") ?? ""),
    assertEquals: String(formData.get("assertEquals") ?? ""),
    assertContains: String(formData.get("assertContains") ?? ""),
    slowAfterMs: Number(formData.get("slowAfterMs") ?? 0),
    skipHolidays: formData.get("skipHolidays") === "on",
    skipWeekends: formData.get("skipWeekends") === "on",
    activeHoursStart: String(formData.get("activeHoursStart") ?? ""),
    activeHoursEnd: String(formData.get("activeHoursEnd") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    sloFailPerDay: Number(formData.get("sloFailPerDay") ?? 0),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid input",
    };
  }

  const jobId = String(formData.get("jobId") ?? "");
  let job;
  try {
    job = jobId
      ? await updateJob(session.tid, jobId, parsed.data, `${session.name} <${session.email}>`)
      : await createJob(session.tid, parsed.data);
    await writeAudit({
      tenantId: session.tid,
      actorId: session.sub,
      action: jobId ? "job.update" : "job.create",
      target: job?.id,
      meta: { name: parsed.data.name },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save job" };
  }
  if (!job) return { error: "Job not found" };
  redirect(`/jobs/${job.id}`);
}
