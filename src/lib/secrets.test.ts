import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";
import { interpolateSecrets } from "./interpolate";

describe("secret interpolation", () => {
  it("replaces known placeholders", () => {
    const out = interpolateSecrets("Bearer {{SECRET:API_TOKEN}}", (key) =>
      key === "API_TOKEN" ? "abc123" : undefined,
    );
    expect(out).toBe("Bearer abc123");
  });

  it("throws on unknown keys", () => {
    expect(() => interpolateSecrets("{{SECRET:MISSING}}", () => undefined)).toThrow(
      /Unknown secret MISSING/,
    );
  });
});

describe("secret encryption", () => {
  it("round-trips a value", () => {
    process.env.AUTH_SECRET = "unit-test-secret";
    const packed = encryptSecret("super-secret");
    expect(decryptSecret(packed)).toBe("super-secret");
  });
});
