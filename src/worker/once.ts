import { claimAndRunDueJobs } from "../lib/runner";
import { checkMissedHeartbeats } from "../lib/notify-missed";
import { sendDueDigests } from "../lib/digest";

async function main() {
  const ran = await claimAndRunDueJobs();
  const missed = await checkMissedHeartbeats();
  const digests = await sendDueDigests();
  if (ran > 0) {
    console.log(`[worker] executed ${ran} due job${ran === 1 ? "" : "s"}`);
  }
  if (digests > 0) {
    console.log(`[worker] sent ${digests} digest${digests === 1 ? "" : "s"}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[worker] tick failed", error);
    process.exit(1);
  });
