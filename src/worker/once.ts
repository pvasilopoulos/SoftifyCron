import { claimAndRunDueJobs } from "../lib/runner";
import { checkMissedHeartbeats } from "../lib/notify-missed";
import { sendDueDigests } from "../lib/digest";
import { sendStatusOutageAlerts } from "../lib/status-subscribers";

async function main() {
  const ran = await claimAndRunDueJobs();
  const missed = await checkMissedHeartbeats();
  const digests = await sendDueDigests();
  const statusAlerts = await sendStatusOutageAlerts();
  if (ran > 0) {
    console.log(`[worker] executed ${ran} due job${ran === 1 ? "" : "s"}`);
  }
  if (missed > 0) {
    console.log(`[worker] ${missed} missed heartbeat${missed === 1 ? "" : "s"}`);
  }
  if (digests > 0) {
    console.log(`[worker] sent ${digests} digest${digests === 1 ? "" : "s"}`);
  }
  if (statusAlerts > 0) {
    console.log(`[worker] sent ${statusAlerts} status alert${statusAlerts === 1 ? "" : "s"}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[worker] tick failed", error);
    process.exit(1);
  });
