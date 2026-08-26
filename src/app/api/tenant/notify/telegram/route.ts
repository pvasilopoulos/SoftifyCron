import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { hasPermission } from "@/lib/acl";
import { jsonError, zodError } from "@/lib/http";
import { telegramWorkspaceActionSchema } from "@/lib/validators";
import { telegramWorkspaceAction } from "@/lib/tenant-notify";
import { appUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) return jsonError("You cannot edit workspace settings", 403);
  const body = await request.json().catch(() => null);
  const parsed = telegramWorkspaceActionSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const origin = parsed.data.origin || appUrl();
    const data = await telegramWorkspaceAction(session.tid, parsed.data.action, origin);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Telegram request failed", 400);
  }
}
