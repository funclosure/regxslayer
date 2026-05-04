import { describe, expect, test } from "bun:test";
import { getPortraitLines } from "@/components/MonsterPortrait";

describe("getPortraitLines", () => {
  test("returns the named portrait", () => {
    const lines = getPortraitLines("scribblet");
    expect(lines.some((l) => l.includes("o.o"))).toBe(true);
  });
  test("returns fallback when name is unknown", () => {
    expect(getPortraitLines("nope-not-a-monster")).toEqual(["???", "???", "???"]);
  });
});
