import { claimAndRunDueJobs } from "../lib/runner";
import { checkMissedHeartbeats } from "../lib/notify-missed";

async function main() {
  const ran = await claimAndRunDueJobs();
  const missed = await checkMissedHeartbeats();
  if (ran > 0) {
    console.log(`[worker] executed ${ran} due job${ran === 1 ? "" : "s"}`);
  }
  if (missed > 0) {
    console.log(`[worker] ${missed} missed heartbeat${missed === 1 ? "" : "s"}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[worker] tick failed", error);
    process.exit(1);
  });
