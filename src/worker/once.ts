import { claimAndRunDueJobs } from "../lib/runner";

async function main() {
  const ran = await claimAndRunDueJobs();
  if (ran > 0) {
    console.log(`[worker] executed ${ran} due job${ran === 1 ? "" : "s"}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[worker] tick failed", error);
    process.exit(1);
  });
