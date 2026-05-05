import { describe, expect, test } from "bun:test";
import { evaluate } from "@/game/matcher";
import type { Monster } from "@/game/types";

const monster: Monster = {
  id: "m",
  name: "Test",
  portrait: "x",
  flavor: "",
  pool: "wild",
  traits: ["LITERAL"],
  layers: [
    {
      topic: "literals",
      traits: ["LITERAL"],
      lines: [
        { text: "alpha", vital: true },
        { text: "beta",  vital: true },
        { text: "noise", vital: false },
      ],
    },
    {
      topic: "more",
      traits: ["LITERAL"],
      lines: [
        { text: "gamma", vital: true },
        { text: "delta", vital: false },
      ],
    },
  ],
  heart: { text: "HEART_TOKEN" },
};

describe("evaluate — layer phase", () => {
  test("empty pattern matches nothing", () => {
    const r = evaluate({ pattern: "", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.vitalsHit).toBe(0);
    expect(r.collateral).toBe(0);
    expect(r.perfect).toBe(false);
  });

  test("perfect match — both vitals, no filler, no locked", () => {
    const r = evaluate({ pattern: "^(alpha|beta)$", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.vitalsHit).toBe(2);
    expect(r.vitalsTotal).toBe(2);
    expect(r.collateral).toBe(0);
    expect(r.perfect).toBe(true);
  });

  test("partial vitals — no perfect", () => {
    const r = evaluate({ pattern: "^alpha$", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.vitalsHit).toBe(1);
    expect(r.perfect).toBe(false);
  });

  test("collateral from active filler counts and blocks perfect", () => {
    const r = evaluate({ pattern: ".+", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.vitalsHit).toBe(2);
    expect(r.collateral).toBeGreaterThanOrEqual(1); // at least the "noise" line
    expect(r.perfect).toBe(false);
  });

  test("matches in locked (future) layers count as collateral", () => {
    const r = evaluate({ pattern: "^(alpha|beta|gamma)$", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.vitalsHit).toBe(2);
    expect(r.collateral).toBeGreaterThanOrEqual(1); // gamma is in locked layer 1
    expect(r.perfect).toBe(false);
  });

  test("invalid regex returns invalid string and no matches", () => {
    const r = evaluate({ pattern: "(", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.invalid).toBeTruthy();
    expect(r.vitalsHit).toBe(0);
    expect(r.collateral).toBe(0);
  });

  test("matchedLineKeys identifies which lines matched", () => {
    const r = evaluate({ pattern: "^alpha$", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.matchedLineKeys.has("0:0")).toBe(true);
    expect(r.matchedLineKeys.has("0:1")).toBe(false);
  });
});

describe("evaluate — heart phase", () => {
  test("perfect heart match", () => {
    const r = evaluate({ pattern: "^HEART_TOKEN$", monster, phase: { kind: "heart" } });
    expect(r.vitalsHit).toBe(1);
    expect(r.vitalsTotal).toBe(1);
    expect(r.perfect).toBe(true);
    expect(r.matchedLineKeys.has("heart")).toBe(true);
  });

  test("matching the heart but also other lines = not perfect", () => {
    const r = evaluate({ pattern: ".+", monster, phase: { kind: "heart" } });
    expect(r.vitalsHit).toBe(1);
    expect(r.collateral).toBeGreaterThan(0);
    expect(r.perfect).toBe(false);
  });
});

describe("evaluate — slow pattern guard", () => {
  test("catastrophic-backtracking pattern aborts within budget", () => {
    const evil = "(a+)+$";
    const slow: Monster = {
      ...monster,
      layers: [{ topic: "x", traits: ["LITERAL"], lines: [{ text: "a".repeat(40) + "X", vital: true }, { text: "a".repeat(40) + "X", vital: true }] }],
      heart: { text: "z" },
    };
    const r = evaluate({ pattern: evil, monster: slow, phase: { kind: "layerActive", layerIdx: 0 }, budgetMs: 50 });
    expect(r.invalid).toBe("slow");
  });
});
