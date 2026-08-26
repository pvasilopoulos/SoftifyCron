import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantSession } from "@/lib/session";
import { jsonError, zodError } from "@/lib/http";
import {
  deletePushSubscription,
  publicVapidKey,
  savePushSubscription,
} from "@/lib/push";
import { prisma } from "@/lib/prisma";

const subscribeSchema = z.object({
  endpoint: z.string().trim().url().max(2048),
  keys: z.object({
    p256dh: z.string().trim().min(10).max(255),
    auth: z.string().trim().min(8).max(255),
  }),
});

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const publicKey = await publicVapidKey();
  const count = await prisma.pushSubscription.count({
    where: { userId: session.sub, tenantId: session.tid },
  });
  return NextResponse.json({ publicKey, subscribed: count > 0 });
}

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const body = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    await savePushSubscription({
      userId: session.sub,
      tenantId: session.tid,
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save push subscription", 400);
  }
}

export async function DELETE(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (endpoint) {
    await deletePushSubscription(session.sub, endpoint);
  } else {
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.sub, tenantId: session.tid },
    });
  }
  return NextResponse.json({ ok: true });
}
