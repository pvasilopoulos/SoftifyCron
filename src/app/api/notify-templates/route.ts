import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { hasPermission } from "@/lib/acl";
import { jsonError, zodError } from "@/lib/http";
import { notifyTemplateSchema } from "@/lib/validators";
import { createNotifyTemplate, listNotifyTemplates } from "@/lib/notify-templates";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const templates = await listNotifyTemplates(session.tid);
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) {
    return jsonError("You cannot edit workspace settings", 403);
  }
  const body = await request.json().catch(() => null);
  const parsed = notifyTemplateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const template = await createNotifyTemplate(session.tid, parsed.data);
    await writeAudit({
      tenantId: session.tid,
      actorId: session.sub,
      action: "notify-template.create",
      target: template.id,
      meta: { name: template.name },
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save template", 400);
  }
}
