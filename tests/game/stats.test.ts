import { describe, expect, test } from "bun:test";
import { classify, sortTraits, formatStatsRow } from "@/game/stats";
import { TRAITS } from "@/game/traits";
import type { TraitStat } from "@/game/types";

const stat = (p: number, n: number): TraitStat => ({ perfectStrips: p, nonPerfectTries: n });

describe("classify", () => {
  test("zero attempts -> no practice yet", () => {
    expect(classify(stat(0, 0))).toEqual({ flag: "⚠", label: "no practice yet", rate: null });
  });
  test("low rate -> needs practice (< 0.5)", () => {
    const r = classify(stat(2, 3));   // total 5, rate 0.4
    expect(r.flag).toBe("⚠");
    expect(r.label).toBe("needs practice");
    expect(r.rate).toBeCloseTo(0.4);
  });
  test("mid rate -> shaky (0.5 .. 0.8)", () => {
    const r = classify(stat(7, 3));   // total 10, rate 0.7
    expect(r.flag).toBe(" ");
    expect(r.label).toBe("shaky");
  });
  test("high rate -> strong (>= 0.8)", () => {
    const r = classify(stat(9, 1));   // total 10, rate 0.9
    expect(r.flag).toBe(" ");
    expect(r.label).toBe("strong");
  });
  test("statistical floor: total < 3 with high rate is still needs practice", () => {
    const r = classify(stat(2, 0));   // total 2, would be 1.0, but < 3 attempts
    expect(r.label).toBe("needs practice");
    expect(r.flag).toBe("⚠");
  });
});

describe("sortTraits", () => {
  test("orders no-practice -> needs -> shaky -> strong, ascending rate within each band", () => {
    const stats: Record<string, TraitStat> = {
      LITERAL:       stat(9, 1),     // strong (0.9)
      ANCHOR_START:  stat(7, 3),     // shaky (0.7)
      QUANT_PLUS:    stat(2, 3),     // needs (0.4)
      ESCAPE:        stat(0, 0),     // no practice
      QUANT_OPTIONAL: stat(1, 4),    // needs (0.2) — should come before QUANT_PLUS
    };
    const rows = sortTraits(stats, TRAITS);
    const order = rows.map((r) => r.trait);
    // Every untracked trait counts as "no practice" and floats up alongside ESCAPE,
    // but among the seeded ones, the order within the no-practice block is stable
    // (insertion order from the TRAITS array). Verify pairwise relations instead.
    const idx = (t: string) => order.indexOf(t);
    expect(idx("ESCAPE")).toBeLessThan(idx("QUANT_OPTIONAL"));      // no-practice before needs
    expect(idx("QUANT_OPTIONAL")).toBeLessThan(idx("QUANT_PLUS"));   // worst-needs first
    expect(idx("QUANT_PLUS")).toBeLessThan(idx("ANCHOR_START"));    // needs before shaky
    expect(idx("ANCHOR_START")).toBeLessThan(idx("LITERAL"));        // shaky before strong
  });

  test("untracked traits show as no-practice", () => {
    const rows = sortTraits({}, TRAITS);
    expect(rows).toHaveLength(TRAITS.length);
    expect(rows.every((r) => r.row.label === "no practice yet")).toBe(true);
  });
});

describe("formatStatsRow", () => {
  test("no-practice row omits percentage", () => {
    const r = classify(stat(0, 0));
    const out = formatStatsRow("ESCAPE", r);
    expect(out).toContain("ESCAPE");
    expect(out).toContain("no practice yet");
    expect(out).not.toContain("%");
  });
  test("strong row shows percentage", () => {
    const r = classify(stat(9, 1));
    const out = formatStatsRow("LITERAL", r);
    expect(out).toContain("LITERAL");
    expect(out).toContain("90%");
    expect(out).toContain("strong");
  });
});
