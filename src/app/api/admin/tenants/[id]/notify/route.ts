import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/session";
import { jsonError, zodError } from "@/lib/http";
import { tenantNotifySchema, notifyTestSchema } from "@/lib/validators";
import { loadPublicNotify, testTenantNotify, updateTenantNotify } from "@/lib/tenant-notify";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const data = await loadPublicNotify(id);
  if (!data) return jsonError("Workspace not found", 404);
  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = tenantNotifySchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const data = await updateTenantNotify(id, parsed.data);
    if (!data) return jsonError("Workspace not found", 404);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save", 400);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = notifyTestSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const result = await testTenantNotify(id, parsed.data.channel);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Test failed", 400);
  }
}
