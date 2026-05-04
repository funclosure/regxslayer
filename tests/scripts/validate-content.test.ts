import { describe, expect, test } from "bun:test";
import { validateChapter, type ValidationIssue } from "@/../scripts/validate-content";
import type { Chapter } from "@/game/types";

const ok: Chapter = {
  id: "test",
  title: "Test",
  intro: "",
  cheatsheet: [],
  monsters: [
    {
      id: "m",
      name: "M",
      portrait: "p",
      flavor: "",
      layers: [
        {
          topic: "t",
          lines: [
            { text: "alpha", vital: true },
            { text: "beta", vital: true },
            { text: "noise", vital: false },
            { text: "https://example.com", vital: false },
          ],
        },
      ],
      heart: { text: "HEART_X1" },
    },
  ],
};

describe("validateChapter", () => {
  test("good chapter has no issues", () => {
    expect(validateChapter(ok)).toEqual([]);
  });

  test("layer with no vitals fails", () => {
    const bad: Chapter = structuredClone(ok);
    bad.monsters[0]!.layers[0]!.lines.forEach((l) => (l.vital = false));
    const issues = validateChapter(bad);
    expect(issues.some((i: ValidationIssue) => i.code === "no-vitals")).toBe(true);
  });

  test("layer over 8 lines fails", () => {
    const bad: Chapter = structuredClone(ok);
    bad.monsters[0]!.layers[0]!.lines = Array.from({ length: 9 }, (_, i) => ({
      text: `x${i}`,
      vital: i === 0,
    }));
    expect(validateChapter(bad).some((i) => i.code === "layer-too-large")).toBe(true);
  });

  test("trivial heart fails", () => {
    const bad: Chapter = structuredClone(ok);
    bad.monsters[0]!.heart.text = "aa";
    expect(validateChapter(bad).some((i) => i.code === "trivial-heart")).toBe(true);
  });

  test("layer killable by .* fails (trivial-killer)", () => {
    const bad: Chapter = structuredClone(ok);
    bad.monsters[0]!.layers[0]!.lines = [
      { text: "alpha", vital: true },
      { text: "beta", vital: true },
    ]; // every line is vital → .+ would clean-strip
    expect(validateChapter(bad).some((i) => i.code === "trivial-killer")).toBe(true);
  });
});
