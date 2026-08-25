import { describe, expect, it } from "vitest";
import { charsetFromContentType, decodeHttpBody } from "./decode";

function bytes(...values: number[]) {
  return Uint8Array.from(values);
}

describe("charsetFromContentType", () => {
  it("reads quoted and unquoted labels", () => {
    expect(charsetFromContentType("text/html; charset=windows-1252")).toBe("windows-1252");
    expect(charsetFromContentType('application/json; charset="utf-8"')).toBe("utf-8");
    expect(charsetFromContentType("text/plain; charset=cp1253")).toBe("windows-1253");
  });
});

describe("decodeHttpBody", () => {
  it("keeps valid UTF-8 Greek", () => {
    const text = '{"name":"Καλημέρα"}';
    const encoded = new TextEncoder().encode(text);
    const result = decodeHttpBody(encoded, "application/json; charset=utf-8");
    expect(result.encoding).toBe("utf-8");
    expect(result.text).toBe(text);
  });

  it("decodes Windows-1253 Greek when UTF-8 is invalid", () => {
    // Καλημέρα in windows-1253 / iso-8859-7 (έ is 0xDD)
    const greek = bytes(0xca, 0xe1, 0xeb, 0xe7, 0xec, 0xdd, 0xf1, 0xe1);
    const result = decodeHttpBody(greek, "text/plain; charset=windows-1252");
    expect(result.text).toBe("Καλημέρα");
    expect(["windows-1253", "iso-8859-7"]).toContain(result.encoding);
  });

  it("honors iso-8859-7 charset", () => {
    const greek = bytes(0xca, 0xe1, 0xeb, 0xe7, 0xec, 0xdd, 0xf1, 0xe1);
    const result = decodeHttpBody(greek, "text/html; charset=iso-8859-7");
    expect(result.text).toBe("Καλημέρα");
  });

  it("decodes windows-1252 Latin text", () => {
    const cafe = bytes(0x63, 0x61, 0x66, 0xe9);
    const result = decodeHttpBody(cafe, "text/plain; charset=windows-1252");
    expect(result.text).toBe("café");
  });

  it("sniffs Greek bytes with no charset", () => {
    const payload = bytes(
      0x7b, 0x22, 0x6e, 0x61, 0x6d, 0x65, 0x22, 0x3a, 0x22,
      0xca, 0xe1, 0xeb, 0xe7, 0xec, 0xdd, 0xf1, 0xe1,
      0x22, 0x7d,
    );
    const result = decodeHttpBody(payload, "application/json");
    expect(result.text).toContain("Καλημέρα");
  });
});
