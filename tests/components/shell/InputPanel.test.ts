import { describe, expect, test } from "bun:test";
import {
  formatPanelTopBorder,
  formatPanelBottomBorder,
  formatPanelFooterRule,
  panelTextRow,
} from "@/components/shell/InputPanel";

describe("formatPanelTopBorder", () => {
  test("no header — full rule with rounded corners", () => {
    const row = formatPanelTopBorder(20);
    expect(row).toBe("╭" + "─".repeat(18) + "╮");
    expect([...row].length).toBe(20);
  });

  test("with header — '╭─ <header> ─...─╮'", () => {
    const row = formatPanelTopBorder(30, "Choose your fight");
    expect([...row].length).toBe(30);
    expect(row.startsWith("╭─ Choose your fight ")).toBe(true);
    expect(row.endsWith("╮")).toBe(true);
    const middle = row.slice("╭─ Choose your fight ".length, -1);
    expect([...middle].every((c) => c === "─")).toBe(true);
  });

  test("header that exactly fits leaves no trailing dashes", () => {
    // width 12: corners(2) + "─ x " (4) + corner(1) → header that needs 5 inner cols
    const row = formatPanelTopBorder(8, "x");
    expect([...row].length).toBe(8);
    expect(row).toBe("╭─ x ──╮");
  });

  test("header longer than available space is truncated to fit", () => {
    const row = formatPanelTopBorder(10, "very long header that overflows");
    expect([...row].length).toBe(10);
    expect(row.startsWith("╭")).toBe(true);
    expect(row.endsWith("╮")).toBe(true);
  });

  test("emoji header preserves exact codepoint width and never splits surrogates", () => {
    // 🔥 is an astral codepoint (UTF-16 surrogate pair). The output should
    // be exactly width codepoints long with no lone surrogates.
    const row = formatPanelTopBorder(20, "🔥");
    expect([...row].length).toBe(20);
    expect(row.startsWith("╭─ 🔥 ")).toBe(true);
    expect(row.endsWith("╮")).toBe(true);
    // Truncation case: 4 fire emojis (8 code units) should not split a surrogate.
    const tight = formatPanelTopBorder(6, "🔥🔥🔥🔥");
    expect([...tight].length).toBe(6);
    // No lone surrogates — every codepoint should be a complete character
    for (const ch of tight) {
      expect(ch.length === 1 || (ch.length === 2 && ch.charCodeAt(0) >= 0xd800)).toBe(true);
    }
  });
});

describe("formatPanelBottomBorder", () => {
  test("rounded corners, dashes between", () => {
    const row = formatPanelBottomBorder(15);
    expect(row).toBe("╰" + "─".repeat(13) + "╯");
    expect([...row].length).toBe(15);
  });
});

describe("formatPanelFooterRule", () => {
  test("no hints — '│─...─│'", () => {
    const row = formatPanelFooterRule(20);
    expect([...row].length).toBe(20);
    expect(row.startsWith("│")).toBe(true);
    expect(row.endsWith("│")).toBe(true);
    const middle = row.slice(1, -1);
    expect([...middle].every((c) => c === "─")).toBe(true);
  });

  test("with hints — '│ ─ <hints> ─...─│'", () => {
    const row = formatPanelFooterRule(40, "[esc] back");
    expect([...row].length).toBe(40);
    expect(row.startsWith("│ ─ [esc] back ")).toBe(true);
    expect(row.endsWith("│")).toBe(true);
  });

  test("hints longer than panel width are clipped", () => {
    const row = formatPanelFooterRule(12, "way too long for this width");
    expect([...row].length).toBe(12);
    expect(row.startsWith("│")).toBe(true);
    expect(row.endsWith("│")).toBe(true);
  });
});

describe("panelTextRow", () => {
  test("content shorter than width is padded to exact width", () => {
    const row = panelTextRow(20, "hi");
    expect([...row].length).toBe(20);
    expect(row).toBe("│ hi               │");
  });

  test("content equal to inner width fits exactly with no padding", () => {
    const row = panelTextRow(10, "abcdef"); // inner=6
    expect([...row].length).toBe(10);
    expect(row).toBe("│ abcdef │");
  });

  test("content longer than inner width is truncated", () => {
    const row = panelTextRow(10, "abcdefghijklmnop");
    expect([...row].length).toBe(10);
    expect(row.startsWith("│ ")).toBe(true);
    expect(row.endsWith(" │")).toBe(true);
  });

  test("emoji content preserves codepoint width without splitting surrogates", () => {
    const row = panelTextRow(10, "🔥🔥🔥🔥🔥🔥"); // 6 codepoints, inner=6
    expect([...row].length).toBe(10);
    // No lone surrogates: every iterated character is a complete codepoint
    for (const ch of row) {
      expect(ch.length === 1 || (ch.length === 2 && ch.charCodeAt(0) >= 0xd800)).toBe(true);
    }
  });

  test("empty content pads to full inner width", () => {
    const row = panelTextRow(8, "");
    expect([...row].length).toBe(8);
    expect(row).toBe("│      │");
  });

  test("width less than 4 returns empty string (no room for borders + content)", () => {
    expect(panelTextRow(3, "x")).toBe("");
    expect(panelTextRow(0, "x")).toBe("");
    expect(panelTextRow(-1, "x")).toBe("");
  });
});
