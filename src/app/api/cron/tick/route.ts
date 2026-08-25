import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import {
  cronSecretConfigured,
  cronSecretFromRequest,
  verifyCronSecret,
} from "@/lib/cron-secret";
import { claimAndRunDueJobs } from "@/lib/runner";

export const dynamic = "force-dynamic";

async function tick(request: Request) {
  if (!cronSecretConfigured()) {
    return jsonError("CRON_SECRET is not set", 503);
  }
  if (!verifyCronSecret(cronSecretFromRequest(request))) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const ran = await claimAndRunDueJobs(8);
    return NextResponse.json({
      ok: true,
      ran,
      tickedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/tick] failed", error);
    return jsonError(error instanceof Error ? error.message : "Tick failed", 500);
  }
}

export async function GET(request: Request) {
  return tick(request);
}

export async function POST(request: Request) {
  return tick(request);
}
