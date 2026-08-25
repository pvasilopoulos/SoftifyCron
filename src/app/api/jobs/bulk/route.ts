import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { bulkJobs, getJobForTenant } from "@/lib/jobs";
import { executeJob } from "@/lib/runner";
import { bulkSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { canManage } from "@/lib/acl";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManage(session.role)) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  try {
    if (parsed.data.action === "run") {
      let count = 0;
      for (const id of parsed.data.ids) {
        const job = await getJobForTenant(session.tid, id);
        if (!job) continue;
        await executeJob(job, "MANUAL");
        count += 1;
      }
      return NextResponse.json({ count });
    }
    const result = await bulkJobs(
      session.tid,
      parsed.data.action,
      parsed.data.ids,
      parsed.data.groupId,
    );
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Bulk failed", 400);
  }
}
