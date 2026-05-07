import { describe, expect, test } from "bun:test";
import {
  navigateChoiceList,
  computeScrollWindow,
  type ChoiceItem,
} from "@/components/shell/panel/ChoiceList";

const choices: ChoiceItem[] = [
  { kind: "section", label: "Chapter 1" },
  { kind: "choice", key: "a", label: "Lump" },
  { kind: "choice", key: "b", label: "Pip" },
  { kind: "section", label: "Chapter 2" },
  { kind: "choice", key: "c", label: "Mire" },
];

describe("navigateChoiceList", () => {
  test("down from a choice skips section headings to next choice", () => {
    // currentIdx = 2 (Pip) → next choice past section heading at 3 is at 4 (Mire)
    expect(navigateChoiceList(choices, 2, "down")).toBe(4);
  });

  test("down from last choice wraps to first choice", () => {
    // currentIdx = 4 (Mire) → wraps past section at 0 to choice at 1 (Lump)
    expect(navigateChoiceList(choices, 4, "down")).toBe(1);
  });

  test("up from a choice skips section heading to previous choice", () => {
    // currentIdx = 4 (Mire) → previous choice past section at 3 is at 2 (Pip)
    expect(navigateChoiceList(choices, 4, "up")).toBe(2);
  });

  test("up from first choice wraps to last choice", () => {
    // currentIdx = 1 (Lump) → wraps past section at 0 to choice at 4 (Mire)
    expect(navigateChoiceList(choices, 1, "up")).toBe(4);
  });

  test("returns currentIdx when no choices exist", () => {
    const sectionsOnly: ChoiceItem[] = [{ kind: "section", label: "Empty" }];
    expect(navigateChoiceList(sectionsOnly, 0, "down")).toBe(0);
  });

  test("returns 0 on empty list", () => {
    expect(navigateChoiceList([], 0, "down")).toBe(0);
  });
});

describe("computeScrollWindow", () => {
  const longList: ChoiceItem[] = Array.from({ length: 12 }, (_, i) => ({
    kind: "choice" as const,
    key: String(i),
    label: `Item ${i}`,
  }));

  test("when items fit, returns full window with no boundary indicators", () => {
    const win = computeScrollWindow(longList.slice(0, 4), 0, 5);
    expect(win.startIdx).toBe(0);
    expect(win.endIdx).toBe(4);
    expect(win.moreAbove).toBe(false);
    expect(win.moreBelow).toBe(false);
  });

  test("when items overflow at top, focused row stays centered, moreBelow flagged", () => {
    const win = computeScrollWindow(longList, 2, 5);
    expect(win.startIdx).toBe(0);
    expect(win.endIdx).toBe(5);
    expect(win.moreAbove).toBe(false);
    expect(win.moreBelow).toBe(true);
  });

  test("focused row near the bottom anchors window to the end", () => {
    const win = computeScrollWindow(longList, 11, 5);
    expect(win.endIdx).toBe(12);
    expect(win.startIdx).toBe(7);
    expect(win.moreAbove).toBe(true);
    expect(win.moreBelow).toBe(false);
  });

  test("focused row in the middle centers the window", () => {
    const win = computeScrollWindow(longList, 6, 5);
    expect(win.startIdx).toBe(4);
    expect(win.endIdx).toBe(9);
    expect(win.moreAbove).toBe(true);
    expect(win.moreBelow).toBe(true);
  });
});
