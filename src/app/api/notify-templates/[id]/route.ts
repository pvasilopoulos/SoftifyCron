import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { hasPermission } from "@/lib/acl";
import { jsonError, zodError } from "@/lib/http";
import { notifyTemplateUpdateSchema } from "@/lib/validators";
import { deleteNotifyTemplate, updateNotifyTemplate } from "@/lib/notify-templates";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) {
    return jsonError("You cannot edit workspace settings", 403);
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = notifyTemplateUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const template = await updateNotifyTemplate(session.tid, id, parsed.data);
    if (!template) return jsonError("Template not found", 404);
    await writeAudit({
      tenantId: session.tid,
      actorId: session.sub,
      action: "notify-template.update",
      target: template.id,
      meta: { name: template.name },
    });
    return NextResponse.json({ template });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save template", 400);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) {
    return jsonError("You cannot edit workspace settings", 403);
  }
  const { id } = await params;
  try {
    const ok = await deleteNotifyTemplate(session.tid, id);
    if (!ok) return jsonError("Template not found", 404);
    await writeAudit({
      tenantId: session.tid,
      actorId: session.sub,
      action: "notify-template.delete",
      target: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not delete template", 409);
  }
}
