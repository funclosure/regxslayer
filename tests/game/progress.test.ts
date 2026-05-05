import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  loadSave,
  recordKill,
  recordTraitAttempt,
  setLastMode,
  saveFilePath,
} from "@/game/progress";
import type { SaveFile } from "@/game/types";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rxs-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadSave", () => {
  test("missing file returns fresh v2 save", () => {
    const save = loadSave({ baseDir: dir });
    expect(save.version).toBe(2);
    expect(save.chapters).toEqual({});
    expect(save.traitStats).toEqual({});
    expect(save.encounterSessions).toBe(0);
    expect(save.encounterKills).toBe(0);
    expect(save.storyKills).toBe(0);
    expect(save.lastMode).toBe(null);
    expect(existsSync(saveFilePath(dir))).toBe(false);
  });

  test("corrupt file is renamed and a fresh save returned", () => {
    writeFileSync(saveFilePath(dir), "not json");
    const save = loadSave({ baseDir: dir });
    expect(save.version).toBe(2);
    const files = readdirSync(dir);
    expect(files.some((f) => f.startsWith("save.json.corrupt-"))).toBe(true);
  });

  test("valid v2 file is parsed", () => {
    const seed: SaveFile = {
      version: 2,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      chapters: { ch1: { monsters: { a: { slainAt: "2026-01-02T00:00:00Z", bestRegexes: {} } } } },
      traitStats: { LITERAL: { perfectStrips: 3, nonPerfectTries: 1 } },
      encounterSessions: 2,
      encounterKills: 5,
      storyKills: 1,
      lastMode: "encounter",
    };
    writeFileSync(saveFilePath(dir), JSON.stringify(seed));
    const save = loadSave({ baseDir: dir });
    expect(save.traitStats["LITERAL"]?.perfectStrips).toBe(3);
    expect(save.lastMode).toBe("encounter");
  });

  test("v1 file migrates forward to v2", () => {
    const v1 = {
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      chapters: {
        "literals-anchors": {
          monsters: {
            scribblet: { slainAt: "2026-01-02T00:00:00Z", bestRegexes: {} },
            caretling: { slainAt: "2026-01-03T00:00:00Z", bestRegexes: {} },
          },
        },
      },
    };
    writeFileSync(saveFilePath(dir), JSON.stringify(v1));
    const save = loadSave({ baseDir: dir });
    expect(save.version).toBe(2);
    expect(save.traitStats).toEqual({});
    expect(save.encounterSessions).toBe(0);
    expect(save.encounterKills).toBe(0);
    expect(save.storyKills).toBe(2); // 2 slainAt entries in v1
    expect(save.lastMode).toBe(null);
    // pre-existing kill record survives
    expect(save.chapters["literals-anchors"]?.monsters["scribblet"]?.slainAt).toBe("2026-01-02T00:00:00Z");
    // migration is persisted to disk (read it back)
    const onDisk = JSON.parse(readFileSync(saveFilePath(dir), "utf8"));
    expect(onDisk.version).toBe(2);
    expect(onDisk.storyKills).toBe(2);
  });

  test("v1 -> v2 migration is idempotent (re-load yields identical save)", () => {
    const v1 = {
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      chapters: { ch: { monsters: { m: { slainAt: "2026-01-02T00:00:00Z", bestRegexes: {} } } } },
    };
    writeFileSync(saveFilePath(dir), JSON.stringify(v1));
    const first = loadSave({ baseDir: dir });
    const second = loadSave({ baseDir: dir });
    expect(second).toEqual(first);
  });
});

describe("recordKill", () => {
  test("adds story kill, persists, reports persisted=true, increments storyKills", () => {
    const save = loadSave({ baseDir: dir });
    const result = recordKill(save, {
      chapterId: "ch1",
      monsterId: "m1",
      bestRegexes: { "0": { pattern: "a", length: 1 } },
      mode: "story",
      now: "2026-05-04T00:00:00Z",
      baseDir: dir,
    });
    expect(result.persisted).toBe(true);
    expect(result.save.storyKills).toBe(1);
    expect(result.save.encounterKills).toBe(0);
    expect(result.save.chapters["ch1"]?.monsters["m1"]?.slainAt).toBe("2026-05-04T00:00:00Z");
  });

  test("encounter kill increments encounterKills and not storyKills", () => {
    const save = loadSave({ baseDir: dir });
    const r1 = recordKill(save, {
      chapterId: "__wild__", monsterId: "wmon", bestRegexes: {},
      mode: "encounter", now: "2026-05-04T00:00:00Z", baseDir: dir,
    });
    expect(r1.save.encounterKills).toBe(1);
    expect(r1.save.storyKills).toBe(0);
  });

  test("re-killing the same monster does not double-increment storyKills", () => {
    let save = loadSave({ baseDir: dir });
    save = recordKill(save, {
      chapterId: "ch1", monsterId: "m1", bestRegexes: {},
      mode: "story", now: "2026-05-04T00:00:00Z", baseDir: dir,
    }).save;
    save = recordKill(save, {
      chapterId: "ch1", monsterId: "m1", bestRegexes: {},
      mode: "story", now: "2026-05-05T00:00:00Z", baseDir: dir,
    }).save;
    expect(save.storyKills).toBe(1); // dedup on (chapterId, monsterId)
  });
});

describe("recordTraitAttempt", () => {
  test("perfect-strip increments perfectStrips for each trait", () => {
    let save = loadSave({ baseDir: dir });
    save = recordTraitAttempt(save, {
      kind: "perfect-strip",
      traits: ["LITERAL", "ANCHOR_START"],
      baseDir: dir,
    }).save;
    expect(save.traitStats["LITERAL"]?.perfectStrips).toBe(1);
    expect(save.traitStats["ANCHOR_START"]?.perfectStrips).toBe(1);
    expect(save.traitStats["LITERAL"]?.nonPerfectTries).toBe(0);
  });

  test("non-perfect-try increments nonPerfectTries for each trait", () => {
    let save = loadSave({ baseDir: dir });
    save = recordTraitAttempt(save, {
      kind: "non-perfect-try",
      traits: ["LITERAL"],
      baseDir: dir,
    }).save;
    expect(save.traitStats["LITERAL"]?.nonPerfectTries).toBe(1);
    expect(save.traitStats["LITERAL"]?.perfectStrips).toBe(0);
  });
});

describe("setLastMode", () => {
  test("sets lastMode and persists", () => {
    const save = loadSave({ baseDir: dir });
    const next = setLastMode(save, "encounter", { baseDir: dir });
    expect(next.save.lastMode).toBe("encounter");
    const reloaded = loadSave({ baseDir: dir });
    expect(reloaded.lastMode).toBe("encounter");
  });
});
