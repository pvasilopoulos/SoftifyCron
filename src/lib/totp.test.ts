import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, totpCode, verifyTotp } from "./totp";

describe("totp", () => {
  it("round-trips base32", () => {
    const raw = Buffer.from("HelloWorld1234567890");
    expect(base32Decode(base32Encode(raw)).equals(raw)).toBe(true);
  });

  it("accepts the current 6-digit code", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const code = totpCode(secret);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, "000000")).toBe(false);
  });
});
