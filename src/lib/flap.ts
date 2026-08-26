const FAILING = new Set(["FAILED", "TIMEOUT", "BLOCKED"]);

export function flapScore(statuses: string[]) {
  let flips = 0;
  for (let i = 1; i < statuses.length; i += 1) {
    const prev = FAILING.has(statuses[i - 1]!);
    const next = FAILING.has(statuses[i]!);
    if (prev !== next) flips += 1;
  }
  return flips;
}

export function flapLabel(score: number) {
  if (score >= 6) return "flapping";
  if (score >= 3) return "unstable";
  return "stable";
}
