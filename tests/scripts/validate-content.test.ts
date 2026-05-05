import { describe, expect, test } from "bun:test";
import { validateChapter, validateMonster, type ValidationIssue } from "@/../scripts/validate-content";
import type { Chapter, Monster } from "@/game/types";

const okChapter: Chapter = {
  id: "test", title: "Test", intro: "", cheatsheet: [],
  monsters: [
    {
      id: "m", name: "M", portrait: "p", flavor: "",
      pool: "story", traits: ["LITERAL"],
      layers: [
        {
          topic: "t", traits: ["LITERAL"],
          lines: [
            { text: "alpha", vital: true },
            { text: "beta",  vital: true },
            { text: "noise", vital: false },
            { text: "https://example.com", vital: false },
          ],
        },
      ],
      heart: { text: "HEART_X1" },
    },
  ],
};

describe("validateChapter — v1 checks still apply", () => {
  test("good chapter has no issues", () => {
    expect(validateChapter(okChapter)).toEqual([]);
  });
  test("layer with no vitals fails", () => {
    const bad: Chapter = structuredClone(okChapter);
    bad.monsters[0]!.layers[0]!.lines.forEach((l) => (l.vital = false));
    const issues = validateChapter(bad);
    expect(issues.some((i: ValidationIssue) => i.code === "no-vitals")).toBe(true);
  });
});

describe("validateMonster — v2 trait/pool checks", () => {
  test("monster with no traits fails", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.traits = [];
    expect(validateMonster(m).some((i) => i.code === "monster-no-traits")).toBe(true);
  });

  test("layer with no traits fails", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.layers[0]!.traits = [];
    expect(validateMonster(m).some((i) => i.code === "layer-no-traits")).toBe(true);
  });

  test("layer trait not in monster traits fails", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.layers[0]!.traits = ["ANCHOR_END"]; // not declared on monster
    expect(validateMonster(m).some((i) => i.code === "layer-trait-not-in-monster")).toBe(true);
  });

  test("missing pool fails", () => {
    const m = structuredClone(okChapter.monsters[0]!);
    delete (m as Partial<Monster>).pool;
    expect(validateMonster(m as Monster).some((i) => i.code === "missing-pool")).toBe(true);
  });

  test("tutorial monster skips trivial-killer check", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.pool = "tutorial";
    // construct a layer that would normally fail trivial-killer (every line vital)
    m.layers[0]!.lines = [{ text: "a", vital: true }, { text: "b", vital: true }];
    const issues = validateMonster(m);
    expect(issues.some((i) => i.code === "trivial-killer")).toBe(false);
  });

  test("tutorial monster missing coaching emits warning, not error", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.pool = "tutorial";
    delete m.coaching;
    const issues = validateMonster(m);
    const w = issues.find((i) => i.code === "tutorial-missing-coaching");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warn");
  });

  test("non-tutorial monster with coaching emits warning", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.coaching = "leftover";
    const issues = validateMonster(m);
    expect(issues.some((i) => i.code === "coaching-on-non-tutorial")).toBe(true);
  });
});
