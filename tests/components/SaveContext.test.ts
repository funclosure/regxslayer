import { describe, expect, test } from "bun:test";
import { computeLifetime } from "@/components/SaveContext";
import type { SaveFile } from "@/game/types";

function makeSave(overrides: Partial<SaveFile> = {}): SaveFile {
  return {
    version: 2,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    chapters: {},
    traitStats: {},
    encounterSessions: 0,
    encounterKills: 0,
    storyKills: 0,
    lastMode: null,
    ...overrides,
  };
}

describe("computeLifetime", () => {
  test("sums storyKills and encounterKills into slain", () => {
    const save = makeSave({ storyKills: 7, encounterKills: 5 });
    expect(computeLifetime(save).slain).toBe(12);
  });

  test("returns encounterSessions directly", () => {
    const save = makeSave({ encounterSessions: 4 });
    expect(computeLifetime(save).sessions).toBe(4);
  });

  test("handles a fresh save (all zeros)", () => {
    const save = makeSave();
    expect(computeLifetime(save)).toEqual({ slain: 0, sessions: 0 });
  });

  test("handles story-only progress (no encounter activity)", () => {
    const save = makeSave({ storyKills: 3 });
    expect(computeLifetime(save)).toEqual({ slain: 3, sessions: 0 });
  });
});
