import { apiError, apiJson, apiOptions, apiZodError } from "@/lib/api-http";
import { actorCan, resolveApiActor } from "@/lib/api-auth";
import { bulkJobs, getJobForTenant } from "@/lib/jobs";
import { executeJob } from "@/lib/runner";
import { bulkSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export function OPTIONS() {
  return apiOptions();
}

export async function POST(request: Request) {
  const actor = await resolveApiActor(request);
  if (!actor) return apiError("Unauthorized", 401, "unauthorized");
  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);

  if (parsed.data.action === "delete" && !actorCan(actor, "jobs.delete")) {
    return apiError("Forbidden", 403, "forbidden");
  }
  if (parsed.data.action === "run" && !actorCan(actor, "jobs.run")) {
    return apiError("Forbidden", 403, "forbidden");
  }
  if (parsed.data.action !== "delete" && parsed.data.action !== "run" && !actorCan(actor, "jobs.write")) {
    return apiError("Forbidden", 403, "forbidden");
  }

  try {
    if (parsed.data.action === "run") {
      let count = 0;
      for (const id of parsed.data.ids) {
        const job = await getJobForTenant(actor.tenantId, id);
        if (!job) continue;
        await executeJob(job, "MANUAL");
        count += 1;
      }
      await writeAudit({
        tenantId: actor.tenantId,
        actorId: actor.actorId,
        action: "job.bulk",
        meta: { via: "api", action: "run", count, actor: actor.actorLabel },
      });
      return apiJson({ count });
    }
    const result = await bulkJobs(actor.tenantId, parsed.data.action, parsed.data.ids, parsed.data.groupId);
    await writeAudit({
      tenantId: actor.tenantId,
      actorId: actor.actorId,
      action: "job.bulk",
      meta: { via: "api", action: parsed.data.action, count: result.count, actor: actor.actorLabel },
    });
    return apiJson(result);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Bulk failed", 400);
  }
}
