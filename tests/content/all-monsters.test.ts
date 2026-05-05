import { describe, expect, test } from "bun:test";
import { allMonsters, storyChapters } from "@/content";
import { validateMonster } from "@/../scripts/validate-content";

describe("all monster content passes the validator", () => {
  for (const m of allMonsters) {
    test(`${m.pool}/${m.id} passes (errors only)`, () => {
      const errors = validateMonster(m).filter((i) => i.severity === "error");
      expect(errors).toEqual([]);
    });
  }
});

describe("monster pool composition", () => {
  test("storyChapters has 3 chapters of 4 monsters each", () => {
    expect(storyChapters.length).toBe(3);
    for (const c of storyChapters) {
      expect(c.monsters.length).toBe(4);
    }
  });
  test("allMonsters covers story + tutorial + wild", () => {
    const pools = new Set(allMonsters.map((m) => m.pool));
    expect(pools.has("story")).toBe(true);
    expect(pools.has("tutorial")).toBe(true);
    expect(pools.has("wild")).toBe(true);
  });
});
