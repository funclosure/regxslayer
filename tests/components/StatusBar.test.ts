import { describe, expect, test } from "bun:test";
import { formatStatusInfoRow, formatStatusHintRow, BRAND } from "@/components/StatusBar";

describe("BRAND", () => {
  test("is regxslayer", () => {
    expect(BRAND).toBe("regxslayer");
  });
});

describe("formatStatusInfoRow", () => {
  test("at terminal width 80, renders full row with all four segments", () => {
    const row = formatStatusInfoRow("regxslayer", "stats", 12, 3, 80);
    expect([...row].length).toBe(80);
    expect(row.startsWith("─── regxslayer · stats · 12 slain · 3 sessions ")).toBe(true);
    const tail = row.slice("─── regxslayer · stats · 12 slain · 3 sessions ".length);
    expect([...tail].every((c) => c === "─")).toBe(true);
  });

  test("drops sessions first when too narrow for the full row", () => {
    // brand=10, screen=5, slain="12 slain"=8, sessions="3 sessions"=10
    // Full segment: "regxslayer · stats · 12 slain · 3 sessions" = 42
    // Full row needs: 3 + 1 + 42 + 1 + 2 (min trailing) = 49
    // Without sessions: "regxslayer · stats · 12 slain" = 29 → needs 36
    // Pick a width between 36 and 48 → drops sessions only.
    const row = formatStatusInfoRow("regxslayer", "stats", 12, 3, 40);
    expect([...row].length).toBe(40);
    expect(row).toContain("12 slain");
    expect(row).not.toContain("sessions");
  });

  test("drops slain next when even narrower", () => {
    // Width 32: needs to drop both sessions and slain. Keep brand + screen.
    // "regxslayer · stats" = 18 → needs 18 + 6 = 24. width 32 ok.
    const row = formatStatusInfoRow("regxslayer", "stats", 12, 3, 32);
    expect([...row].length).toBe(32);
    expect(row).toContain("regxslayer · stats");
    expect(row).not.toContain("slain");
    expect(row).not.toContain("sessions");
  });

  test("drops screen label as last fallback before brand-only", () => {
    // Width 20: even "regxslayer · stats" (24 needed) doesn't fit → brand-only.
    // "regxslayer" = 10 → needs 10 + 6 = 16. width 20 ok.
    const row = formatStatusInfoRow("regxslayer", "stats", 12, 3, 20);
    expect([...row].length).toBe(20);
    expect(row.startsWith("─── regxslayer ")).toBe(true);
    expect(row).not.toContain("stats");
    const tail = row.slice("─── regxslayer ".length);
    expect([...tail].every((c) => c === "─")).toBe(true);
  });

  test("brand stays visible even at extreme narrow widths", () => {
    // width 14: brand-only needs 16, so floor to truncated brand.
    const row = formatStatusInfoRow("regxslayer", "stats", 12, 3, 14);
    expect([...row].length).toBe(14);
    expect(row).toContain("regxslayer");
  });

  test("supports zero counts", () => {
    const row = formatStatusInfoRow("regxslayer", "stats", 0, 0, 80);
    expect([...row].length).toBe(80);
    expect(row).toContain("0 slain");
    expect(row).toContain("0 sessions");
  });
});

describe("formatStatusHintRow", () => {
  test("non-empty hints are left-padded by 1 space and right-filled to width", () => {
    const row = formatStatusHintRow("[r] reset · [esc] back", 40);
    expect([...row].length).toBe(40);
    expect(row.startsWith(" [r] reset · [esc] back")).toBe(true);
    expect(row.slice(" [r] reset · [esc] back".length)).toBe(" ".repeat(40 - " [r] reset · [esc] back".length));
  });

  test("empty hints renders a row of width spaces", () => {
    const row = formatStatusHintRow("", 30);
    expect(row).toBe(" ".repeat(30));
  });

  test("hints longer than width are clipped to width", () => {
    const row = formatStatusHintRow("very long hint that does not fit", 10);
    expect([...row].length).toBe(10);
  });
});
