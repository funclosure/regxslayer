import { describe, expect, test } from "bun:test";
import { computeDamage, symbolicFor } from "@/game/damage";

describe("computeDamage", () => {
  test("perfect = 100", () => {
    expect(computeDamage({ vitalsHit: 2, vitalsTotal: 2, collateral: 0 })).toBe(100);
  });
  test("half vitals, no collateral = 50", () => {
    expect(computeDamage({ vitalsHit: 1, vitalsTotal: 2, collateral: 0 })).toBe(50);
  });
  test("all vitals, 1 collateral = 75", () => {
    expect(computeDamage({ vitalsHit: 2, vitalsTotal: 2, collateral: 1 })).toBe(75);
  });
  test("all vitals, 4+ collateral floors at 20", () => {
    expect(computeDamage({ vitalsHit: 2, vitalsTotal: 2, collateral: 4 })).toBe(20);
    expect(computeDamage({ vitalsHit: 2, vitalsTotal: 2, collateral: 99 })).toBe(20);
  });
  test("zero vitals = 0", () => {
    expect(computeDamage({ vitalsHit: 0, vitalsTotal: 2, collateral: 0 })).toBe(0);
  });
  test("vitalsTotal 0 returns 0", () => {
    expect(computeDamage({ vitalsHit: 0, vitalsTotal: 0, collateral: 0 })).toBe(0);
  });
});

describe("symbolicFor", () => {
  test("0 = no match", () => {
    expect(symbolicFor(0)).toEqual({ glyph: "⚪", label: "no match" });
  });
  test("25 = partial", () => {
    expect(symbolicFor(25)).toEqual({ glyph: "🔸", label: "partial" });
  });
  test("75 = close", () => {
    expect(symbolicFor(75)).toEqual({ glyph: "🔶", label: "close" });
  });
  test("100 = perfect", () => {
    expect(symbolicFor(100)).toEqual({ glyph: "🔥", label: "perfect" });
  });
});
