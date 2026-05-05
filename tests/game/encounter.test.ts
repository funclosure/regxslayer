import { describe, expect, test } from "bun:test";
import { pickNext } from "@/game/encounter";
import type { Monster } from "@/game/types";

const m = (id: string): Monster => ({
  id, name: id, portrait: "", flavor: "",
  pool: "wild", traits: ["LITERAL"],
  layers: [{ topic: "x", traits: ["LITERAL"], lines: [{ text: "a", vital: true }] }],
  heart: { text: "HEART_X" },
});

const seededRng = (values: number[]): (() => number) => {
  let i = 0;
  return () => {
    const v = values[i % values.length] ?? 0;
    i++;
    return v;
  };
};

describe("pickNext", () => {
  test("returns the only monster when pool size is 1", () => {
    const pool = [m("a")];
    expect(pickNext(pool, null).id).toBe("a");
    expect(pickNext(pool, "a").id).toBe("a");
  });

  test("returns a different monster than previousId when pool size >= 2", () => {
    const pool = [m("a"), m("b"), m("c")];
    // rng=0 -> idx 0; if previousId is "a", reroll to 0.5 -> idx 1
    const rng = seededRng([0, 0.5]);
    expect(pickNext(pool, "a", rng).id).toBe("b");
  });

  test("uniform random when previousId is null", () => {
    const pool = [m("a"), m("b"), m("c")];
    expect(pickNext(pool, null, seededRng([0])).id).toBe("a");
    expect(pickNext(pool, null, seededRng([0.34])).id).toBe("b");
    expect(pickNext(pool, null, seededRng([0.99])).id).toBe("c");
  });

  test("throws on empty pool", () => {
    expect(() => pickNext([], null)).toThrow();
  });
});
