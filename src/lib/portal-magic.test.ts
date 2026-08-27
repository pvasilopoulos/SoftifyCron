import { describe, expect, it } from "vitest";
import { signPortalMagic, verifyPortalMagic } from "./portal-magic";
import { monthlyOpsCsv, monthlyOpsPdf, pdfSafe, reportMonthRange } from "./report";

describe("portal magic links", () => {
  it("round-trips emails that contain dots", () => {
    process.env.AUTH_SECRET ??= "test-secret-for-portal-magic";
    const token = signPortalMagic("cl_1", "ops@client.example.com");
    expect(token.split(".")).toHaveLength(2);
    expect(verifyPortalMagic(token)).toEqual({
      clientId: "cl_1",
      email: "ops@client.example.com",
    });
  });

  it("rejects expired and tampered tokens", () => {
    process.env.AUTH_SECRET ??= "test-secret-for-portal-magic";
    const expired = signPortalMagic("cl_1", "ops@client.com", -1_000);
    expect(verifyPortalMagic(expired)).toBeNull();
    const token = signPortalMagic("cl_1", "ops@client.com");
    expect(verifyPortalMagic(`${token}x`)).toBeNull();
    expect(verifyPortalMagic("nope")).toBeNull();
  });
});

describe("monthly ops files", () => {
  it("builds csv and a latin PDF", () => {
    const rows = [{ job: "Ping", type: "HTTP", runs: 2, failed: 1, incidents: 1, openMinutes: 12 }];
    expect(monthlyOpsCsv(rows)).toContain("Ping");
    const pdf = monthlyOpsPdf("Acme ops", "2026-08", rows);
    expect(pdf.toString("utf8").startsWith("%PDF-1.4")).toBe(true);
    expect(pdfSafe("Αθήνα Ping")).toBe("????? Ping");
  });

  it("parses month keys", () => {
    expect(reportMonthRange("2026-01", new Date("2026-08-27T00:00:00Z")).key).toBe("2026-01");
    expect(reportMonthRange(null, new Date("2026-08-27T12:00:00Z")).key).toBe("2026-08");
  });
});
