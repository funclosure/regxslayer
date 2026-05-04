import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadSave, recordKill, saveFilePath } from "@/game/progress";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rxs-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadSave", () => {
  test("missing file returns fresh save", () => {
    const save = loadSave({ baseDir: dir });
    expect(save.version).toBe(1);
    expect(save.chapters).toEqual({});
    expect(existsSync(saveFilePath(dir))).toBe(false);
  });

  test("corrupt file is renamed and a fresh save returned", () => {
    writeFileSync(saveFilePath(dir), "not json");
    const save = loadSave({ baseDir: dir });
    expect(save.chapters).toEqual({});
    const files = readdirSync(dir);
    expect(files.some((f) => f.startsWith("save.json.corrupt-"))).toBe(true);
  });

  test("valid file is parsed", () => {
    const seed = {
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      chapters: {
        "char-classes": {
          monsters: {
            grim: {
              slainAt: "2026-01-02T00:00:00Z",
              bestRegexes: { "0": { pattern: "a", length: 1 } },
            },
          },
        },
      },
    };
    writeFileSync(saveFilePath(dir), JSON.stringify(seed));
    const save = loadSave({ baseDir: dir });
    expect(save.chapters["char-classes"]?.monsters["grim"]?.bestRegexes["0"]?.pattern).toBe("a");
  });
});

describe("recordKill", () => {
  test("adds monster record, persists, and reports persisted=true", () => {
    const save = loadSave({ baseDir: dir });
    const result = recordKill(save, {
      chapterId: "ch1",
      monsterId: "m1",
      bestRegexes: { "0": { pattern: "a", length: 1 } },
      now: "2026-05-04T00:00:00Z",
      baseDir: dir,
    });
    expect(result.persisted).toBe(true);
    expect(result.save.chapters["ch1"]?.monsters["m1"]?.slainAt).toBe("2026-05-04T00:00:00Z");
    const reloaded = loadSave({ baseDir: dir });
    expect(reloaded.chapters["ch1"]?.monsters["m1"]?.bestRegexes["0"]?.pattern).toBe("a");
  });

  test("reports persisted=false when the base directory cannot be written", () => {
    // /dev/null is not a directory, so mkdirSync + writeFileSync underneath will fail
    const save = loadSave({ baseDir: dir });
    const result = recordKill(save, {
      chapterId: "ch1",
      monsterId: "m1",
      bestRegexes: {},
      now: "2026-05-04T00:00:00Z",
      baseDir: "/dev/null/nope",
    });
    expect(result.persisted).toBe(false);
    // In-memory result should still be updated for the caller
    expect(result.save.chapters["ch1"]?.monsters["m1"]?.slainAt).toBe("2026-05-04T00:00:00Z");
  });
});
