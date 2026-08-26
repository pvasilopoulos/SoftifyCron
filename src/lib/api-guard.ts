import { actorCan, resolveApiActor, type ApiActor } from "@/lib/api-auth";
import { apiError } from "@/lib/api-http";
import type { ApiScope } from "@/lib/api-scopes";

export async function requireV1(request: Request, scope: ApiScope): Promise<
  { actor: ApiActor; error?: undefined } | { actor?: undefined; error: ReturnType<typeof apiError> }
> {
  const actor = await resolveApiActor(request);
  if (!actor) return { error: apiError("Unauthorized", 401, "unauthorized") };
  if (!actorCan(actor, scope)) return { error: apiError("Forbidden", 403, "forbidden") };
  return { actor };
}
