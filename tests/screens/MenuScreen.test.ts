import { describe, expect, test } from "bun:test";
import { buildMenuItems, navigateMenu } from "@/screens/MenuScreen";
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
