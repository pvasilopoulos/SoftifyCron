import { describe, expect, it } from "vitest";
import { heartbeatStatus, HEARTBEAT_STALE_MS } from "./heartbeat-status";

describe("heartbeatStatus", () => {
  it("is stale when never ticked", () => {
    expect(heartbeatStatus(null).stale).toBe(true);
    expect(heartbeatStatus(null).label).toBe("Never ticked");
  });

  it("is healthy within two minutes", () => {
    const now = Date.now();
    expect(heartbeatStatus(new Date(now - 30_000), now).stale).toBe(false);
    expect(heartbeatStatus(new Date(now - HEARTBEAT_STALE_MS - 1), now).stale).toBe(true);
  });
});
