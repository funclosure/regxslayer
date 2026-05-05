import { describe, expect, test } from "bun:test";
import { buildLandingRows, buildMenuItems, buildMenuRows, navigateMenu } from "@/screens/MenuScreen";
import type { SaveFile } from "@/game/types";

const empty: SaveFile = {
  version: 2, createdAt: "", updatedAt: "",
  chapters: {}, traitStats: {}, encounterSessions: 0, encounterKills: 0, storyKills: 0, lastMode: null,
};

describe("buildMenuItems", () => {
  test("hides Continue when lastMode is null", () => {
    const items = buildMenuItems(empty);
    expect(items.map((i) => i.key)).toEqual(["story", "encounter", "tutorial", "stats", "quit"]);
  });
  test("shows Continue first when lastMode is set", () => {
    const items = buildMenuItems({ ...empty, lastMode: "encounter" });
    expect(items[0]!.key).toBe("continue");
  });
});

describe("navigateMenu", () => {
  test("down advances and wraps", () => {
    expect(navigateMenu(3, 0, "down")).toBe(1);
    expect(navigateMenu(3, 2, "down")).toBe(0);
  });
  test("up retreats and wraps", () => {
    expect(navigateMenu(3, 0, "up")).toBe(2);
  });
  test("zero items returns 0", () => {
    expect(navigateMenu(0, 0, "down")).toBe(0);
  });
});

describe("buildLandingRows", () => {
  test("renders the pixel title, monster art, tagline, and selectable menu rows", () => {
    const rows = buildLandingRows(buildMenuItems({ ...empty, lastMode: "story" }), 0);
    expect(rows.some((row) => row.includes("____  _____"))).toBe(true);
    expect(rows.some((row) => row.includes("[^filler]"))).toBe(true);
    expect(rows.some((row) => row.includes("^heart$"))).toBe(true);
    expect(rows.map((row) => row.trim())).toContain("precision is damage");
    expect(rows.map((row) => row.trimEnd())).toContain("▶ Continue");
    expect(rows.map((row) => row.trimEnd())).toContain("  Story");
  });

  test("keeps every landing row within the minimum terminal width", () => {
    const rows = buildLandingRows(buildMenuItems({ ...empty, lastMode: "story" }), 0);
    expect(Math.max(...rows.map((row) => row.length))).toBeLessThanOrEqual(76);
  });

  test("left-aligns options inside the centered menu block", () => {
    const rows = buildMenuRows(buildMenuItems({ ...empty, lastMode: "story" }), 0);
    expect(new Set(rows.map((row) => row.length)).size).toBe(1);
    expect(rows[0]!.startsWith("▶ Continue")).toBe(true);
    expect(rows[1]!.startsWith("  Story")).toBe(true);
  });
});
