import { apiJson, apiOptions, apiError, apiZodError, parseTakeSkip } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { loadPublicJob } from "@/lib/api-job";
import { publicJob } from "@/lib/api-public";
import { createJob, listJobs } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";
import { JOB_TYPES } from "@/lib/acl";
import type { JobType } from "@prisma/client";

export function OPTIONS() {
  return apiOptions();
}

export async function GET(request: Request) {
  const auth = await requireV1(request, "jobs.read");
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const { take, skip } = parseTakeSkip(searchParams, 100, 200);
  const typeRaw = searchParams.get("type");
  const type = JOB_TYPES.includes(typeRaw as (typeof JOB_TYPES)[number]) ? (typeRaw as JobType) : undefined;
  const stateRaw = searchParams.get("state");
  const state =
    stateRaw === "armed" || stateRaw === "paused" || stateRaw === "failing" ? stateRaw : undefined;
  const jobs = await listJobs(auth.actor.tenantId, {
    q: searchParams.get("q") ?? undefined,
    groupId: searchParams.get("group") ?? undefined,
    type,
    state,
    take,
    skip,
  });
  return apiJson({ jobs: jobs.map(publicJob), take, skip });
}

export async function POST(request: Request) {
  const auth = await requireV1(request, "jobs.write");
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = jobInputSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);
  try {
    const job = await createJob(auth.actor.tenantId, parsed.data);
    await writeAudit({
      tenantId: auth.actor.tenantId,
      actorId: auth.actor.actorId,
      action: "job.create",
      target: job.id,
      meta: { via: "api", actor: auth.actor.actorLabel },
    });
    return apiJson({ job: (await loadPublicJob(auth.actor.tenantId, job.id)) ?? publicJob(job) }, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Could not create job", 400);
  }
}
