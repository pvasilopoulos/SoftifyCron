import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/session";
import { jsonError, zodError } from "@/lib/http";
import { telegramWorkspaceActionSchema } from "@/lib/validators";
import { telegramWorkspaceAction } from "@/lib/tenant-notify";
import { appUrl } from "@/lib/app-url";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = telegramWorkspaceActionSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const origin = parsed.data.origin || appUrl();
    const data = await telegramWorkspaceAction(id, parsed.data.action, origin);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Telegram request failed", 400);
  }
}
