import { describe, expect, test } from "bun:test";
import { hasAnySlain, isSlain, isChapterUnlocked, buildStoryChoiceItems } from "@/screens/StorySelectScreen";
import type { Chapter, SaveFile } from "@/game/types";

const emptySave: SaveFile = {
  version: 2, createdAt: "", updatedAt: "", chapters: {},
  traitStats: {}, encounterSessions: 0, encounterKills: 0, storyKills: 0, lastMode: null,
};
const partialSave: SaveFile = {
  version: 2, createdAt: "", updatedAt: "",
  chapters: { ch1: { monsters: { a: { slainAt: "2026-01-01", bestRegexes: {} } } } },
  traitStats: {}, encounterSessions: 0, encounterKills: 0, storyKills: 0, lastMode: null,
};

const chapters: Chapter[] = [
  { id: "ch1", title: "C1", intro: "", cheatsheet: [],
    monsters: [{ id: "a", name: "A", portrait: "p", flavor: "", pool: "story", traits: ["LITERAL"], layers: [], heart: { text: "" } }] },
  { id: "ch2", title: "C2", intro: "", cheatsheet: [],
    monsters: [{ id: "b", name: "B", portrait: "p", flavor: "", pool: "story", traits: ["LITERAL"], layers: [], heart: { text: "" } }] },
];

describe("isSlain", () => {
  test("true when slainAt present", () => expect(isSlain(partialSave, "ch1", "a")).toBe(true));
  test("false when missing", () => expect(isSlain(partialSave, "ch1", "b")).toBe(false));
  test("false when chapter missing", () => expect(isSlain(emptySave, "ch1", "a")).toBe(false));
});

describe("hasAnySlain", () => {
  test("true when any slain", () => expect(hasAnySlain(partialSave, "ch1")).toBe(true));
  test("false on empty save", () => expect(hasAnySlain(emptySave, "ch1")).toBe(false));
});

describe("isChapterUnlocked", () => {
  test("first chapter is always unlocked", () => {
    expect(isChapterUnlocked(emptySave, chapters, 0)).toBe(true);
  });
  test("second chapter locked when no kills in first", () => {
    expect(isChapterUnlocked(emptySave, chapters, 1)).toBe(false);
  });
  test("second chapter unlocked when first has any kill", () => {
    expect(isChapterUnlocked(partialSave, chapters, 1)).toBe(true);
  });
});

describe("buildStoryChoiceItems", () => {
  test("first chapter unlocked, locked chapters render as section-only rows with no monsters", () => {
    const items = buildStoryChoiceItems(chapters, emptySave);
    expect(items[0]).toEqual({ kind: "section", label: "C1 — 0/1 slain" });
    expect(items[1]).toEqual({ kind: "choice", key: "ch1:a", label: "· A" });
    expect(items[2]).toEqual({ kind: "section", label: "C2 (locked)" });
    expect(items.length).toBe(3); // locked chapter contributes no choice rows
  });

  test("slain monsters render with ✓ mark; chapter count reflects slain total", () => {
    const items = buildStoryChoiceItems(chapters, partialSave);
    expect(items[0]).toEqual({ kind: "section", label: "C1 — 1/1 slain" });
    expect(items[1]).toEqual({ kind: "choice", key: "ch1:a", label: "✓ A" });
    // c2 unlocks once any m is slain in c1
    expect(items[2]).toEqual({ kind: "section", label: "C2 — 0/1 slain" });
    expect(items[3]).toEqual({ kind: "choice", key: "ch2:b", label: "· B" });
  });
});
