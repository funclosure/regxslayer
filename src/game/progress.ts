import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { BestRegex, SaveFile, SaveMode, TraitStat } from "./types";
import type { Trait } from "./traits";

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
  return {
    version: 2,
    createdAt: now,
    updatedAt: now,
    chapters: {},
    traitStats: {},
    encounterSessions: 0,
    encounterKills: 0,
    storyKills: 0,
    lastMode: null,
  };
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
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed["version"] === 2 && typeof parsed["chapters"] === "object") {
      return parsed as unknown as SaveFile;
    }
    if (parsed["version"] === 1 && typeof parsed["chapters"] === "object") {
      const migrated = migrateV1ToV2(parsed as V1Save);
      // Persist immediately (migration must survive even if the player quits before any new event).
      persist(migrated, baseDir);
      return migrated;
    }
    throw new Error("invalid save shape");
  } catch {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    try { renameSync(path, `${path}.corrupt-${stamp}`); } catch { /* ignore */ }
    return freshSave();
  }
}

type V1Save = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  chapters: Record<string, { monsters: Record<string, { slainAt: string; bestRegexes: Record<string, BestRegex> }> }>;
};

function migrateV1ToV2(v1: V1Save): SaveFile {
  let storyKills = 0;
  for (const ch of Object.values(v1.chapters)) {
    for (const m of Object.values(ch.monsters)) {
      if (m.slainAt) storyKills++;
    }
  }
  return {
    version: 2,
    createdAt: v1.createdAt,
    updatedAt: new Date().toISOString(),
    chapters: v1.chapters,
    traitStats: {},
    encounterSessions: 0,
    encounterKills: 0,
    storyKills,
    lastMode: null,
  };
}

export type RecordKillInput = {
  chapterId: string;
  monsterId: string;
  bestRegexes: Record<string, BestRegex>;
  mode: SaveMode;
  now?: string;
  baseDir?: string;
};

export type RecordKillResult = {
  save: SaveFile;
  persisted: boolean;
};

export function recordKill(save: SaveFile, input: RecordKillInput): RecordKillResult {
  const now = input.now ?? new Date().toISOString();
  const baseDir = input.baseDir ?? defaultBaseDir();
  const chapter = save.chapters[input.chapterId] ?? { monsters: {} };
  const existing = chapter.monsters[input.monsterId];
  const merged = mergeBest(existing?.bestRegexes ?? {}, input.bestRegexes);
  const isFirstKill = !existing?.slainAt;
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
    storyKills: save.storyKills + (isFirstKill && input.mode === "story" ? 1 : 0),
    encounterKills: save.encounterKills + (input.mode === "encounter" ? 1 : 0),
  };
  const persisted = persist(nextSave, baseDir);
  return { save: nextSave, persisted };
}

export type TraitAttemptInput =
  | { kind: "perfect-strip"; traits: Trait[]; baseDir?: string; now?: string }
  | { kind: "non-perfect-try"; traits: Trait[]; baseDir?: string; now?: string };

export type TraitAttemptResult = {
  save: SaveFile;
  persisted: boolean;
};

export function recordTraitAttempt(save: SaveFile, input: TraitAttemptInput): TraitAttemptResult {
  const baseDir = input.baseDir ?? defaultBaseDir();
  const now = input.now ?? new Date().toISOString();
  const stats = { ...save.traitStats };
  for (const t of input.traits) {
    const cur: TraitStat = stats[t] ?? { perfectStrips: 0, nonPerfectTries: 0 };
    stats[t] = input.kind === "perfect-strip"
      ? { perfectStrips: cur.perfectStrips + 1, nonPerfectTries: cur.nonPerfectTries }
      : { perfectStrips: cur.perfectStrips, nonPerfectTries: cur.nonPerfectTries + 1 };
  }
  const nextSave: SaveFile = { ...save, updatedAt: now, traitStats: stats };
  const persisted = persist(nextSave, baseDir);
  return { save: nextSave, persisted };
}

export type SetLastModeResult = {
  save: SaveFile;
  persisted: boolean;
};

export function setLastMode(save: SaveFile, mode: SaveMode | null, opts: { baseDir?: string; now?: string } = {}): SetLastModeResult {
  const baseDir = opts.baseDir ?? defaultBaseDir();
  const now = opts.now ?? new Date().toISOString();
  const nextSave: SaveFile = { ...save, updatedAt: now, lastMode: mode };
  const persisted = persist(nextSave, baseDir);
  return { save: nextSave, persisted };
}

export type IncrementEncounterSessionsResult = {
  save: SaveFile;
  persisted: boolean;
};

export function incrementEncounterSessions(save: SaveFile, opts: { baseDir?: string; now?: string } = {}): IncrementEncounterSessionsResult {
  const baseDir = opts.baseDir ?? defaultBaseDir();
  const now = opts.now ?? new Date().toISOString();
  const nextSave: SaveFile = { ...save, updatedAt: now, encounterSessions: save.encounterSessions + 1 };
  const persisted = persist(nextSave, baseDir);
  return { save: nextSave, persisted };
}

export type ResetStatsResult = {
  save: SaveFile;
  persisted: boolean;
};

/** Stats screen reset — wipes practice numbers but preserves story progress (chapters/best regexes). */
export function resetStats(save: SaveFile, opts: { baseDir?: string; now?: string } = {}): ResetStatsResult {
  const baseDir = opts.baseDir ?? defaultBaseDir();
  const now = opts.now ?? new Date().toISOString();
  const nextSave: SaveFile = {
    ...save,
    updatedAt: now,
    traitStats: {},
    encounterSessions: 0,
    encounterKills: 0,
    storyKills: 0,
  };
  const persisted = persist(nextSave, baseDir);
  return { save: nextSave, persisted };
}

function mergeBest(prev: Record<string, BestRegex>, add: Record<string, BestRegex>): Record<string, BestRegex> {
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
    return false;
  }
}
