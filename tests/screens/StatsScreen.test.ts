import { describe, expect, test } from "bun:test";
import { renderStatsRowText } from "@/screens/StatsScreen";
import type { TraitStat } from "@/game/types";

describe("renderStatsRowText", () => {
  test("no-practice row omits percentage and shows 0/0", () => {
    const out = renderStatsRowText("ESCAPE", { perfectStrips: 0, nonPerfectTries: 0 });
    expect(out).toContain("ESCAPE");
    expect(out).toContain("0/0");
    expect(out).toContain("no practice yet");
    expect(out).not.toContain("%");
  });

  test("strong row shows perfectStrips/total and percentage", () => {
    const stat: TraitStat = { perfectStrips: 9, nonPerfectTries: 1 };
    const out = renderStatsRowText("LITERAL", stat);
    expect(out).toContain("9/10");
    expect(out).toContain("90%");
    expect(out).toContain("strong");
  });

  test("statistical-floor row labels needs-practice", () => {
    const stat: TraitStat = { perfectStrips: 1, nonPerfectTries: 0 };
    const out = renderStatsRowText("GROUP", stat);
    expect(out).toContain("1/1");
    expect(out).toContain("needs practice");
  });
});
