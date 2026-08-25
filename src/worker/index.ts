import { claimAndRunDueJobs } from "../lib/runner";
import { checkMissedHeartbeats } from "../lib/notify-missed";
import { sendDueDigests } from "../lib/digest";

const TICK_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`[worker] SoftifyCron scheduler started (tick ${TICK_MS}ms)`);
  for (;;) {
    try {
      const ran = await claimAndRunDueJobs();
      const missed = await checkMissedHeartbeats();
      const digests = await sendDueDigests();
      if (ran > 0) {
        console.log(`[worker] executed ${ran} due job${ran === 1 ? "" : "s"}`);
      }
      if (digests > 0) {
        console.log(`[worker] sent ${digests} digest${digests === 1 ? "" : "s"}`);
      }
    } catch (error) {
      console.error("[worker] tick failed", error);
    }
    await sleep(TICK_MS);
  }
}

main();
