import { describe, expect, it } from "vitest";
import { buildCurl } from "./curl";

describe("buildCurl", () => {
  it("quotes the URL and headers", () => {
    const cmd = buildCurl({
      method: "POST",
      url: "https://example.com/hook",
      headers: { "content-type": "application/json" },
      body: '{"ok":true}',
    });
    expect(cmd).toContain("-X POST");
    expect(cmd).toContain("https://example.com/hook");
    expect(cmd).toContain("--data-raw");
  });
});
