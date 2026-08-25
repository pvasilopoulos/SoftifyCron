import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import {
  cronSecretConfigured,
  cronSecretFromRequest,
  verifyCronSecret,
} from "@/lib/cron-secret";
import { claimAndRunDueJobs } from "@/lib/runner";
import { checkMissedHeartbeats } from "@/lib/notify-missed";
import { sendDueDigests } from "@/lib/digest";
import { sendStatusOutageAlerts } from "@/lib/status-subscribers";

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
    const missed = await checkMissedHeartbeats();
    const digests = await sendDueDigests();
    const statusAlerts = await sendStatusOutageAlerts();
    return NextResponse.json({
      ok: true,
      ran,
      missed,
      digests,
      statusAlerts,
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
