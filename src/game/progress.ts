import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { BestRegex, SaveFile } from "./types";

export function defaultBaseDir(): string {
  if (process.platform !== "darwin" && process.env["XDG_DATA_HOME"]) {
    return join(process.env["XDG_DATA_HOME"]!, "regxslayer");
  }
  return join(homedir(), ".regxslayer");
}

export function saveFilePath(baseDir: string): string {
  return join(baseDir, "save.json");
}

function freshSave(): SaveFile {
  const now = new Date().toISOString();
  return { version: 1, createdAt: now, updatedAt: now, chapters: {} };
}

export type LoadOptions = { baseDir?: string };

export function loadSave(opts: LoadOptions = {}): SaveFile {
  const baseDir = opts.baseDir ?? defaultBaseDir();
  const path = saveFilePath(baseDir);
  if (!existsSync(path)) return freshSave();
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return freshSave();
  }
  try {
    const parsed = JSON.parse(raw) as SaveFile;
    if (parsed.version !== 1 || typeof parsed.chapters !== "object") {
      throw new Error("invalid shape");
    }
    return parsed;
  } catch {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    try { renameSync(path, `${path}.corrupt-${stamp}`); } catch { /* ignore */ }
    return freshSave();
  }
}

export type RecordKillInput = {
  chapterId: string;
  monsterId: string;
  bestRegexes: Record<string, BestRegex>;
  now?: string;
  baseDir?: string;
};

export type RecordKillResult = {
  save: SaveFile;
  /** True if the on-disk file was written successfully. UI should warn when false. */
  persisted: boolean;
};

export function recordKill(save: SaveFile, input: RecordKillInput): RecordKillResult {
  const now = input.now ?? new Date().toISOString();
  const baseDir = input.baseDir ?? defaultBaseDir();
  const chapter = save.chapters[input.chapterId] ?? { monsters: {} };
  const existing = chapter.monsters[input.monsterId];
  const merged = mergeBest(existing?.bestRegexes ?? {}, input.bestRegexes);
  const nextSave: SaveFile = {
    ...save,
    updatedAt: now,
    chapters: {
      ...save.chapters,
      [input.chapterId]: {
        monsters: {
          ...chapter.monsters,
          [input.monsterId]: {
            slainAt: existing?.slainAt ?? now,
            bestRegexes: merged,
          },
        },
      },
    },
  };
  const persisted = persist(nextSave, baseDir);
  return { save: nextSave, persisted };
}

function mergeBest(
  prev: Record<string, BestRegex>,
  add: Record<string, BestRegex>,
): Record<string, BestRegex> {
  const out: Record<string, BestRegex> = { ...prev };
  for (const [k, v] of Object.entries(add)) {
    const existing = out[k];
    if (!existing || v.length < existing.length) out[k] = v;
  }
  return out;
}

function persist(save: SaveFile, baseDir: string): boolean {
  try {
    mkdirSync(baseDir, { recursive: true });
    const path = saveFilePath(baseDir);
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, JSON.stringify(save, null, 2), "utf8");
    renameSync(tmp, path);
    return true;
  } catch {
    // The caller (App router, Task 20) tracks persisted=false and shows a
    // non-blocking footer warning per spec §9 (save unwritable).
    return false;
  }
}
