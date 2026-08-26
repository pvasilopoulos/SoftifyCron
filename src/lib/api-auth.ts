import type { Permission } from "@/lib/acl";
import { hasPermission } from "@/lib/acl";
import { expandApiScopes, hasApiScope, resolveStoredScopes, type ApiScope } from "@/lib/api-scopes";
import { resolveApiToken } from "@/lib/api-tokens";
import { getTenantSession } from "@/lib/session";

const SESSION_SCOPE: Record<ApiScope, Permission> = {
  "jobs.read": "jobs.view",
  "jobs.write": "jobs.edit",
  "jobs.run": "jobs.run",
  "jobs.delete": "jobs.delete",
  "runs.read": "runs.view",
};

export type ApiActor = {
  tenantId: string;
  kind: "session" | "token";
  actorId: string | null;
  actorLabel: string;
  scopes: ApiScope[];
  overrideLock: boolean;
};

export async function resolveApiActor(request: Request): Promise<ApiActor | null> {
  const session = await getTenantSession();
  if (session) {
    const scopes = expandApiScopes(
      (Object.keys(SESSION_SCOPE) as ApiScope[]).filter((scope) =>
        hasPermission(session, SESSION_SCOPE[scope]),
      ),
    );
    return {
      tenantId: session.tid,
      kind: "session",
      actorId: session.sub,
      actorLabel: `${session.name} <${session.email}>`,
      scopes,
      overrideLock: session.role === "OWNER" || Boolean(session.platform),
    };
  }

  const token = await resolveApiToken(request.headers.get("authorization"));
  if (!token) return null;
  return {
    tenantId: token.tenantId,
    kind: "token",
    actorId: null,
    actorLabel: `token:${token.name}`,
    scopes: resolveStoredScopes(token.scopes),
    overrideLock: false,
  };
}

export function actorCan(actor: ApiActor, scope: ApiScope) {
  return hasApiScope(actor.scopes, scope);
}
