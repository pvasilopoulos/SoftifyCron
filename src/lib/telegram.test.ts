import { describe, expect, it } from "vitest";
import { chatsFromTelegramUpdates, looksLikeTelegramToken, telegramCommandUrl } from "./telegram";

describe("telegram helpers", () => {
  it("accepts BotFather tokens", () => {
    expect(looksLikeTelegramToken("123456:ABC-DEF_ghiJKLMNOPQRSTUV")).toBe(true);
    expect(looksLikeTelegramToken("nope")).toBe(false);
  });

  it("dedupes chats from getUpdates payloads", () => {
    const chats = chatsFromTelegramUpdates([
      { message: { chat: { id: -1001, title: "Ops", type: "supergroup" } } },
      { message: { chat: { id: -1001, title: "Ops" } } },
      { message: { chat: { id: 42, first_name: "Ada", type: "private" } } },
      { update_id: 1 },
    ]);
    expect(chats).toEqual([
      { id: "-1001", label: "Ops · -1001" },
      { id: "42", label: "Ada · 42" },
    ]);
  });

  it("builds the command webhook URL", () => {
    expect(telegramCommandUrl("https://cron.softify.gr/", "abc")).toBe(
      "https://cron.softify.gr/api/bots/telegram?secret=abc",
    );
  });
});
