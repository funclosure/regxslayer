import { describe, expect, test } from "bun:test";
import { computeShellWidth } from "@/components/shell/Shell";

describe("computeShellWidth", () => {
  test("returns terminalWidth when capWidth=false (combat case)", () => {
    expect(computeShellWidth(80, false)).toBe(80);
    expect(computeShellWidth(200, false)).toBe(200);
  });

  test("returns terminalWidth when below cap and capWidth=true", () => {
    expect(computeShellWidth(80, true)).toBe(80);
    expect(computeShellWidth(140, true)).toBe(140);
  });

  test("clamps to 140 when above cap and capWidth=true", () => {
    expect(computeShellWidth(141, true)).toBe(140);
    expect(computeShellWidth(200, true)).toBe(140);
  });
});
