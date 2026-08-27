import { NextResponse } from "next/server";
import { loadPortalAccess } from "@/lib/portal-access";
import { getPortalJob } from "@/lib/portal";
import { ackJob } from "@/lib/jobs";
import { writeAudit } from "@/lib/audit";
import { jsonError, zodError } from "@/lib/http";
import { portalAckSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const access = await loadPortalAccess();
  if (!access) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const job = await getPortalJob(access.tenant.id, access.groupIds, id);
  if (!job) return jsonError("Job not found", 404);
  const body = await request.json().catch(() => ({}));
  const parsed = portalAckSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const email = access.client?.email.split(",")[0]?.trim() || "portal";
  await ackJob(
    access.tenant.id,
    id,
    { name: access.actorName, email },
    parsed.data.note ?? "",
  );
  await writeAudit({
    tenantId: access.tenant.id,
    action: "portal.ack",
    target: id,
    meta: { client: access.actorName, note: parsed.data.note ?? "" },
  });
  return NextResponse.json({ ok: true });
}
