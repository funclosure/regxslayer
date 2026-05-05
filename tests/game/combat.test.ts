import { describe, expect, test } from "bun:test";
import { initialState, advance, type CombatState } from "@/game/combat";
import type { Monster } from "@/game/types";

const monster: Monster = {
  id: "m",
  name: "Test",
  portrait: "x",
  flavor: "",
  pool: "wild",
  traits: ["LITERAL"],
  layers: [
    { topic: "l1", traits: ["LITERAL"], lines: [{ text: "a", vital: true }] },
    { topic: "l2", traits: ["LITERAL"], lines: [{ text: "b", vital: true }] },
  ],
  heart: { text: "H" },
};

describe("combat state machine", () => {
  test("initial state is intro", () => {
    const s = initialState(monster);
    expect(s.phase.kind).toBe("intro");
    expect(s.layersStripped).toEqual([]);
  });

  test("dismissIntro → layerActive(0)", () => {
    const s = advance(initialState(monster), { kind: "dismissIntro" });
    expect(s.phase).toEqual({ kind: "layerActive", layerIdx: 0 });
  });

  test("perfectMatch on layer 0 → strip then layer 1", () => {
    let s: CombatState = advance(initialState(monster), { kind: "dismissIntro" });
    s = advance(s, { kind: "perfectMatch", pattern: "a" });
    expect(s.phase.kind).toBe("strip");
    s = advance(s, { kind: "stripDone" });
    expect(s.phase).toEqual({ kind: "layerActive", layerIdx: 1 });
    expect(s.layersStripped).toEqual([0]);
    expect(s.bestRegexes["0"]?.pattern).toBe("a");
  });

  test("perfectMatch on last layer → strip then heart", () => {
    let s: CombatState = advance(initialState(monster), { kind: "dismissIntro" });
    s = advance(s, { kind: "perfectMatch", pattern: "a" });
    s = advance(s, { kind: "stripDone" });
    s = advance(s, { kind: "perfectMatch", pattern: "b" });
    s = advance(s, { kind: "stripDone" });
    expect(s.phase).toEqual({ kind: "heart" });
    expect(s.layersStripped).toEqual([0, 1]);
  });

  test("perfectMatch in heart → kill", () => {
    let s = initialState(monster);
    s = advance(s, { kind: "dismissIntro" });
    s = advance(s, { kind: "perfectMatch", pattern: "a" });
    s = advance(s, { kind: "stripDone" });
    s = advance(s, { kind: "perfectMatch", pattern: "b" });
    s = advance(s, { kind: "stripDone" });
    s = advance(s, { kind: "perfectMatch", pattern: "H" });
    expect(s.phase).toEqual({ kind: "kill" });
    expect(s.bestRegexes["heart"]?.pattern).toBe("H");
  });

  test("best regex is the shortest perfect pattern per layer", () => {
    let s = initialState(monster);
    s = advance(s, { kind: "dismissIntro" });
    s = advance(s, { kind: "perfectMatch", pattern: "[a]" }); // length 3
    s = advance(s, { kind: "perfectMatch", pattern: "a" });   // length 1 — should win
    expect(s.bestRegexes["0"]?.pattern).toBe("a");
    expect(s.bestRegexes["0"]?.length).toBe(1);
  });

  test("perfectMatch ignored outside layerActive/heart", () => {
    const s = initialState(monster); // intro
    const s2 = advance(s, { kind: "perfectMatch", pattern: "a" });
    expect(s2).toBe(s);
  });
});
