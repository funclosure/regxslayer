import { describe, expect, test } from "bun:test";
import {
  formatPanelTopBorder,
  formatPanelBottomBorder,
  formatPanelFooterRule,
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
