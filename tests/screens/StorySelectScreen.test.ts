import { describe, expect, test } from "bun:test";
import { hasAnySlain, isSlain, isChapterUnlocked } from "@/screens/StorySelectScreen";
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
