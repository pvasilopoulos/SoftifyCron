import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { subscribeStatus } from "@/lib/status-subscribers";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  try {
    const result = await subscribeStatus(slug, String(body.email ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not subscribe", 400);
  }
}
