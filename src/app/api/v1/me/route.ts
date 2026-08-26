import { prisma } from "@/lib/prisma";
import { apiError, apiJson, apiOptions } from "@/lib/api-http";
import { resolveApiActor } from "@/lib/api-auth";

export function OPTIONS() {
  return apiOptions();
}

export async function GET(request: Request) {
  const actor = await resolveApiActor(request);
  if (!actor) return apiError("Unauthorized", 401, "unauthorized");
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { id: true, name: true, slug: true, timezone: true },
  });
  if (!tenant) return apiError("Workspace not found", 404, "not_found");
  return apiJson({
    actor: { kind: actor.kind, label: actor.actorLabel },
    workspace: tenant,
    scopes: actor.scopes,
  });
}
