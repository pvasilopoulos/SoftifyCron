import { apiJson, apiOptions } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { publicGroup } from "@/lib/api-public";
import { listGroups } from "@/lib/groups";

export function OPTIONS() {
  return apiOptions();
}

export async function GET(request: Request) {
  const auth = await requireV1(request, "jobs.read");
  if (auth.error) return auth.error;
  const groups = await listGroups(auth.actor.tenantId);
  return apiJson({ groups: groups.map(publicGroup) });
}
