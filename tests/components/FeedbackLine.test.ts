import { describe, expect, test } from "bun:test";
import { formatFeedback } from "@/components/FeedbackLine";

describe("formatFeedback", () => {
  test("produces numeric breakdown", () => {
    const r = formatFeedback({ vitalsHit: 1, vitalsTotal: 2, collateral: 0, damage: 50 });
    expect(r.numeric).toBe("1/2 vitals · collateral 0 · dmg 50");
  });
  test("symbolic for 50 = close", () => {
    const r = formatFeedback({ vitalsHit: 1, vitalsTotal: 2, collateral: 0, damage: 50 });
    expect(r.symbolic).toContain("close");
  });
  test("symbolic for 100 = perfect", () => {
    const r = formatFeedback({ vitalsHit: 2, vitalsTotal: 2, collateral: 0, damage: 100 });
    expect(r.symbolic).toContain("perfect");
  });
  test("symbolic for 0 = no match", () => {
    const r = formatFeedback({ vitalsHit: 0, vitalsTotal: 2, collateral: 0, damage: 0 });
    expect(r.symbolic).toContain("no match");
  });
});
