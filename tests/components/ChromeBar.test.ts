import { describe, expect, test } from "bun:test";
import { formatChromeRow, BRAND } from "@/components/ChromeBar";

describe("BRAND", () => {
  test("is regxslayer", () => {
    expect(BRAND).toBe("regxslayer");
  });
});

describe("formatChromeRow", () => {
  test("with hints, fills middle with dashes to width", () => {
    const row = formatChromeRow("regxslayer", "[esc] back", 80);
    expect([...row].length).toBe(80);
    expect(row.startsWith("─── regxslayer ")).toBe(true);
    expect(row.endsWith(" [esc] back ───")).toBe(true);
    // Middle is all dashes
    const middle = row.slice("─── regxslayer ".length, row.length - " [esc] back ───".length);
    expect([...middle].every((c) => c === "─")).toBe(true);
  });

  test("with empty hints, fills entire right side with dashes", () => {
    const row = formatChromeRow("regxslayer", "", 80);
    expect([...row].length).toBe(80);
    expect(row.startsWith("─── regxslayer ")).toBe(true);
    const tail = row.slice("─── regxslayer ".length);
    expect([...tail].every((c) => c === "─")).toBe(true);
  });

  test("narrow terminal below brand+hints+12 falls back to empty-hints form", () => {
    // brand=10, hints=21, threshold = 43. width=30 falls back.
    const row = formatChromeRow("regxslayer", "[esc] back · [?] help", 30);
    expect([...row].length).toBe(30);
    expect(row.startsWith("─── regxslayer ")).toBe(true);
    // No hints in output
    expect(row).not.toContain("[esc]");
    const tail = row.slice("─── regxslayer ".length);
    expect([...tail].every((c) => c === "─")).toBe(true);
  });

  test("at exactly the threshold width, hints fit", () => {
    // brand=10, hints=10, threshold = 32. width=32 fits.
    const row = formatChromeRow("regxslayer", "[esc] back", 32);
    expect([...row].length).toBe(32);
    expect(row).toContain("[esc] back");
    expect(row.endsWith(" [esc] back ───")).toBe(true);
  });

  test("one below threshold drops hints", () => {
    const row = formatChromeRow("regxslayer", "[esc] back", 31);
    expect([...row].length).toBe(31);
    expect(row).not.toContain("[esc]");
  });
});
