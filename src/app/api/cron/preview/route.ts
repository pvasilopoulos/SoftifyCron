import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { describeCron, previewRuns } from "@/lib/cron";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { searchParams } = new URL(request.url);
  const expr = searchParams.get("expr") ?? "";
  const tz = searchParams.get("tz") ?? "UTC";
  try {
    const next = previewRuns(expr, tz, 4).map((date) => date.toISOString());
    return NextResponse.json({ human: describeCron(expr), next });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid cron", 400);
  }
}
