import { describe, expect, it } from "vitest";
import { fitMysqlLongText } from "./response-body";

describe("fitMysqlLongText", () => {
  it("keeps a body that already fits", () => {
    expect(fitMysqlLongText("Καλημέρα", 80)).toBe("Καλημέρα");
  });

  it("cuts on a UTF-8 character boundary", () => {
    expect(fitMysqlLongText("αβ", 2)).toBe("α");
    expect(fitMysqlLongText("αβ", 1)).toBe("");
    expect(fitMysqlLongText("ok👍", 4)).toBe("ok");
  });
});
