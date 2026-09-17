/**
 * @vitest-environment node
 *
 * Gate D unit coverage for the customer-facing intent parser.
 *
 * Two things are being locked down here:
 *   1. The no-arg / Unknown boundary — Telegram updates arrive without text
 *      (photos, stickers, voice notes, service messages) and the webhook passes
 *      `message?.text` straight through. The parser is the boundary and must be
 *      a TOTAL function: every missing/odd shape yields a well-formed Unknown
 *      intent and never throws.
 *   2. The Unknown branch itself is a real, reachable outcome (not dead code) —
 *      genuinely unrecognised chatter must not be mistaken for a payment
 *      promise or a reported payment.
 */
import { describe, it, expect } from "vitest";
import { parseTelegramIntent, type TelegramIntent } from "../telegramIntentParser.js";

/** The Unknown branch, asserted without relying on the echoed text. */
function expectUnknown(intent: TelegramIntent, expectedText = "") {
  expect(intent.intent).toBe("unknown");
  expect(intent).toHaveProperty("text");
  expect((intent as { text: string }).text).toBe(expectedText);
}

describe("telegramIntentParser", () => {
  describe("no-arg / missing-text boundary (Gate D)", () => {
    it("returns a well-formed Unknown intent when called with no arguments", () => {
      // @ts-expect-error — deliberately violating the signature: this is the
      // no-arg call the gate requires to be safe at runtime.
      expectUnknown(parseTelegramIntent());
    });

    it("returns Unknown for undefined", () => {
      expectUnknown(parseTelegramIntent(undefined));
    });

    it("returns Unknown for null", () => {
      expectUnknown(parseTelegramIntent(null));
    });

    it("returns Unknown for an empty string", () => {
      expectUnknown(parseTelegramIntent(""));
    });

    it("returns Unknown for whitespace-only text", () => {
      expectUnknown(parseTelegramIntent("   \t\n  "));
    });

    it("never throws for any non-text shape", () => {
      // Telegram can hand us anything; the boundary must absorb it.
      const oddInputs: unknown[] = [undefined, null, "", " ", 0, NaN, false, {}, [], () => {}];
      for (const input of oddInputs) {
        expect(() => parseTelegramIntent(input as string)).not.toThrow();
        const intent = parseTelegramIntent(input as string);
        expect(typeof intent.intent).toBe("string");
      }
    });

    it("echoes the normalized (trimmed) text on the Unknown branch", () => {
      expectUnknown(parseTelegramIntent("   ???   "), "???");
    });
  });

  describe("Unknown branch stays reachable", () => {
    it("classifies unrecognised English chatter as Unknown", () => {
      expectUnknown(parseTelegramIntent("hello there friend"), "hello there friend");
    });

    it("classifies unrecognised Amharic chatter as Unknown", () => {
      expectUnknown(parseTelegramIntent("ንደን ህ"), "ንደን ህ");
    });

    it("classifies emoji-only input as Unknown", () => {
      expectUnknown(parseTelegramIntent("🙂🙂"), "🙂🙂");
    });

    it("does not treat a bare amount as a payment report", () => {
      // "200" alone must not silently become a payment report.
      expect(parseTelegramIntent("200").intent).toBe("unknown");
    });
  });

  describe("code intent", () => {
    it("accepts exactly four unambiguous characters", () => {
      expect(parseTelegramIntent("A7K2")).toEqual({ intent: "code", code: "A7K2" });
    });

    it("upper-cases the code", () => {
      expect(parseTelegramIntent("a7k2")).toEqual({ intent: "code", code: "A7K2" });
    });

    it("rejects codes of the wrong length", () => {
      expect(parseTelegramIntent("A7K").intent).toBe("unknown");
      expect(parseTelegramIntent("A7K2X").intent).not.toBe("code");
    });
  });
});