import { getJobForTenant } from "@/lib/jobs";
import { publicJob } from "@/lib/api-public";

export async function loadPublicJob(tenantId: string, jobId: string) {
  const job = await getJobForTenant(tenantId, jobId);
  return job ? publicJob(job) : null;
}
