# regxslayer v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add encounter mode, a 15-trait practice-stats system, and a tutorial mode (with inline coaching) on top of v1, per `docs/superpowers/specs/2026-05-04-regxslayer-v2-encounter-stats-design.md`.

**Architecture:** Additive over v1. Three new pure-logic modules (`traits.ts`, `encounter.ts`, extended `progress.ts`), one extended hook (`useCombatEngine`), four new screens (`StatsScreen`, `EncounterIntroScreen`, `EncounterVictoryScreen`, `TutorialSelectScreen`), one renamed screen (`ChapterSelectScreen` → `StorySelectScreen`), and an extended router. Existing combat / matcher / damage / state machine stay untouched.

**Tech Stack:** Same as v1 — Bun (runtime + bundler + test runner), gridland (`@gridland/bun`, `@gridland/utils`), React 19, TypeScript.

**Spec reference:** `docs/superpowers/specs/2026-05-04-regxslayer-v2-encounter-stats-design.md` — `(spec §N)` cites this file.

---

## Conventions (same as v1)

- Paths relative to `/Users/victor/Documents/Workspace/Projects/regxslayer`.
- Every code step shows full file content; replace earlier versions entirely.
- Conventional Commits.
- Build (`bun test`, `bun run typecheck`, `bun run validate-content`) MUST be green before each commit.
- v1's testing pivot continues: pure helpers tested via `bun:test`; render-level checks deferred to manual smoke. `@gridland/testing` is broken upstream and stays uninstalled.

---

# Phase 0 — Foundation: traits + types

## Task 0: Trait vocabulary

**Files:**
- Create: `src/game/traits.ts`
- Create: `tests/game/traits.test.ts`

Spec ref: §2.

- [ ] **Step 1: Write the failing test**

Create `tests/game/traits.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { TRAITS, type Trait } from "@/game/traits";

describe("TRAITS", () => {
  test("contains 15 entries", () => {
    expect(TRAITS.length).toBe(15);
  });
  test("has no duplicates", () => {
    expect(new Set(TRAITS).size).toBe(TRAITS.length);
  });
  test("includes the documented trait names", () => {
    const expected = new Set([
      "LITERAL", "ALTERNATION", "GROUP",
      "ANCHOR_START", "ANCHOR_END",
      "CHAR_CLASS_DIGIT", "CHAR_CLASS_WORD", "CHAR_CLASS_SPACE",
      "CHAR_CLASS_SET", "CHAR_CLASS_RANGE",
      "QUANT_STAR", "QUANT_PLUS", "QUANT_OPTIONAL", "QUANT_EXACT",
      "ESCAPE",
    ]);
    expect(new Set(TRAITS)).toEqual(expected);
  });
  test("Trait type is a string-literal union (typecheck guard)", () => {
    const x: Trait = "LITERAL";
    expect(x).toBe("LITERAL");
  });
});
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `bun test tests/game/traits.test.ts`
Expected: FAIL — "Cannot find module '@/game/traits'".

- [ ] **Step 3: Implement**

Create `src/game/traits.ts`:

```ts
/**
 * The single controlled vocabulary of regex features the game can grade
 * the player on. Used by:
 *   - Layer.traits / Monster.traits in src/game/types.ts
 *   - SaveFile.traitStats keys
 *   - StatsScreen sorting and labelling
 *   - Validator (each layer.traits is a subset of monster.traits)
 *
 * Adding a new trait:
 *   1. Append to TRAITS (new traits go at the end to keep stable indices
 *      if anything ever serialises by position — currently nothing does,
 *      but the convention is cheap insurance).
 *   2. Update src/content/* to tag any existing layer that exercises it.
 *   3. Update the v2 spec's trait table.
 *
 * Removing a trait would break existing save files (trait keys would
 * persist in traitStats with no row in the StatsScreen). Don't remove
 * lightly; consider deprecation flags instead.
 */
export const TRAITS = [
  "LITERAL",
  "ALTERNATION",
  "GROUP",
  "ANCHOR_START",
  "ANCHOR_END",
  "CHAR_CLASS_DIGIT",
  "CHAR_CLASS_WORD",
  "CHAR_CLASS_SPACE",
  "CHAR_CLASS_SET",
  "CHAR_CLASS_RANGE",
  "QUANT_STAR",
  "QUANT_PLUS",
  "QUANT_OPTIONAL",
  "QUANT_EXACT",
  "ESCAPE",
] as const;

export type Trait = (typeof TRAITS)[number];

export const TRAIT_SET: ReadonlySet<Trait> = new Set(TRAITS);

export function isTrait(s: string): s is Trait {
  return (TRAIT_SET as ReadonlySet<string>).has(s);
}
```

- [ ] **Step 4: Confirm pass**

Run: `bun test tests/game/traits.test.ts`
Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/traits.ts tests/game/traits.test.ts
git commit -m "feat(game): trait vocabulary (15 controlled traits)"
```

---

## Task 1: Extend types — Layer/Monster/SaveFile (v2 shape)

**Files:**
- Modify: `src/game/types.ts` (entire rewrite to match v2 shape)

Spec ref: §3.

- [ ] **Step 1: Replace `src/game/types.ts`**

```ts
// src/game/types.ts
import type { Trait } from "./traits";

export type Line = {
  text: string;
  vital: boolean;
};

export type Layer = {
  topic: string;
  traits: Trait[];        // v2: non-empty, subset of the parent monster's traits
  lines: Line[];
  coaching?: string;      // v2: only used by tutorial mode
};

export type MonsterPool = "story" | "wild" | "tutorial";

export type Monster = {
  id: string;
  name: string;
  portrait: string;
  flavor: string;
  pool: MonsterPool;       // v2: drives mode selection
  traits: Trait[];         // v2: non-empty, union over layers (+ heart traits if any)
  layers: Layer[];
  heart: { text: string };
  coaching?: string;       // v2: shown during INTRO phase, tutorial mode only
};

export type Chapter = {
  id: string;
  title: string;
  intro: string;
  cheatsheet: string[];
  monsters: Monster[];
};

export type EvalResult = {
  vitalsHit: number;
  vitalsTotal: number;
  collateral: number;
  perfect: boolean;
  invalid?: string;
  /** Per-line match map, keyed by `${layerIdx}:${lineIdx}` for the body view. Heart entries use `heart`. */
  matchedLineKeys: ReadonlySet<string>;
};

export type CombatPhase =
  | { kind: "intro" }
  | { kind: "layerActive"; layerIdx: number }
  | { kind: "strip"; layerIdx: number }
  | { kind: "heart" }
  | { kind: "kill" };

export type BestRegex = {
  pattern: string;
  length: number;
};

export type MonsterRecord = {
  slainAt: string;
  bestRegexes: Record<string, BestRegex>;
};

// v2: trait-stat shape — see spec §3.5
export type TraitStat = {
  /** # of layers cleanly stripped while exercising this trait. */
  perfectStrips: number;
  /** # of distinct non-perfect patterns submitted on layers tagged with this trait,
   *  deduped per (trait, layer-life). */
  nonPerfectTries: number;
};

export type SaveMode = "story" | "encounter" | "tutorial";

export type SaveFile = {
  version: 2;
  createdAt: string;
  updatedAt: string;
  chapters: Record<string, { monsters: Record<string, MonsterRecord> }>;
  // v2 fields
  traitStats: Record<string, TraitStat>;   // keyed by Trait literal
  encounterSessions: number;
  encounterKills: number;
  storyKills: number;
  lastMode: SaveMode | null;
};
```

- [ ] **Step 2: Typecheck — expect breakage in `src/content/*` and `src/game/progress.ts`**

Run: `bun run typecheck`
Expected: errors in:
- `src/content/chapter-1-literals.ts`, `chapter-2-charclasses.ts`, `chapter-3-quantifiers.ts` — missing `traits`/`pool` on monsters and layers.
- `src/content/chapter-1-literals.ts` (placeholder content already replaced).
- `src/game/progress.ts` — `SaveFile` shape changed (version, new fields).

We will fix `src/content/*` in Tasks 6–8 and `src/game/progress.ts` in Task 2. **Do not commit yet** — typecheck must be clean before commit.

- [ ] **Step 3: Hold the commit**

The next task fixes the resulting type errors. Once both Task 1 and Task 2 are implemented and typecheck-clean, they'll be committed in Task 2's final step (single combined commit covering both type changes).

(Implementer note: this task intentionally produces a temporarily broken tree. Continue immediately to Task 2.)

---

# Phase 1 — Pure logic (TDD)

## Task 2: Save migration + recordTraitAttempt + lastMode

**Files:**
- Modify: `src/game/progress.ts` (rewrite)
- Modify: `tests/game/progress.test.ts` (extend)

Spec ref: §3.4, §3.5.

- [ ] **Step 1: Write failing tests**

Replace `tests/game/progress.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `bun test tests/game/progress.test.ts`
Expected: failures — `recordTraitAttempt`/`setLastMode` not exported, `recordKill` signature changed, etc.

- [ ] **Step 3: Replace `src/game/progress.ts`**

```ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { BestRegex, SaveFile, SaveMode, Trait, TraitStat } from "./types";

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
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `bun test tests/game/progress.test.ts`
Expected: all pass.

- [ ] **Step 5: Run full suite + typecheck**

Run: `bun run typecheck && bun test`
Expected: typecheck still has errors in `src/content/*` and any consumer of v1 `recordKill` signature (the old call from `src/app.tsx` doesn't pass `mode`). **Hold the commit; Tasks 5–8 will fix.**

(Implementer note: typecheck won't be clean until Tasks 5–8 land. Keep the working tree dirty across these tasks; commit each task as a separate logical change, but only run the full `bun test` at task boundaries that should be green.)

- [ ] **Step 6: Combined commit for Tasks 1 + 2**

```bash
git add src/game/types.ts src/game/progress.ts tests/game/progress.test.ts
git commit -m "feat(game): v2 types + save migration + trait/last-mode/reset persistence"
```

(Typecheck and `bun test` are still red after this commit — that's expected and will resolve once Tasks 5–8 finish content updates and Task 11 fixes the App router.)

---

## Task 3: Encounter `pickNext` selector

**Files:**
- Create: `src/game/encounter.ts`
- Create: `tests/game/encounter.test.ts`

Spec ref: §5.2.

- [ ] **Step 1: Write failing tests**

Create `tests/game/encounter.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { pickNext } from "@/game/encounter";
import type { Monster } from "@/game/types";

const m = (id: string): Monster => ({
  id, name: id, portrait: "", flavor: "",
  pool: "wild", traits: ["LITERAL"],
  layers: [{ topic: "x", traits: ["LITERAL"], lines: [{ text: "a", vital: true }] }],
  heart: { text: "HEART_X" },
});

const seededRng = (values: number[]): (() => number) => {
  let i = 0;
  return () => {
    const v = values[i % values.length] ?? 0;
    i++;
    return v;
  };
};

describe("pickNext", () => {
  test("returns the only monster when pool size is 1", () => {
    const pool = [m("a")];
    expect(pickNext(pool, null).id).toBe("a");
    expect(pickNext(pool, "a").id).toBe("a");
  });

  test("returns a different monster than previousId when pool size >= 2", () => {
    const pool = [m("a"), m("b"), m("c")];
    // rng=0 -> idx 0; if previousId is "a", reroll to 0.5 -> idx 1
    const rng = seededRng([0, 0.5]);
    expect(pickNext(pool, "a", rng).id).toBe("b");
  });

  test("uniform random when previousId is null", () => {
    const pool = [m("a"), m("b"), m("c")];
    expect(pickNext(pool, null, seededRng([0])).id).toBe("a");
    expect(pickNext(pool, null, seededRng([0.34])).id).toBe("b");
    expect(pickNext(pool, null, seededRng([0.99])).id).toBe("c");
  });

  test("throws on empty pool", () => {
    expect(() => pickNext([], null)).toThrow();
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `bun test tests/game/encounter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/game/encounter.ts`:

```ts
import type { Monster } from "./types";

/**
 * Pick the next encounter monster.
 *  - Uniform random over `pool`.
 *  - When pool.length >= 2, never returns a monster whose id equals `previousId` —
 *    rerolls until a different one comes up.
 *  - Pure given a deterministic `rng`.
 */
export function pickNext(pool: Monster[], previousId: string | null, rng: () => number = Math.random): Monster {
  if (pool.length === 0) {
    throw new Error("pickNext: empty pool");
  }
  if (pool.length === 1) {
    return pool[0]!;
  }
  // Cap retries defensively to avoid infinite loops on degenerate rng (e.g. rng always returns 0).
  for (let attempt = 0; attempt < 100; attempt++) {
    const idx = Math.floor(rng() * pool.length) % pool.length;
    const pick = pool[idx]!;
    if (pick.id !== previousId) return pick;
  }
  // Fallback: linear scan for any non-previousId monster (we know pool size >= 2).
  return pool.find((m) => m.id !== previousId) ?? pool[0]!;
}
```

- [ ] **Step 4: Run, expect pass**

Run: `bun test tests/game/encounter.test.ts`
Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/encounter.ts tests/game/encounter.test.ts
git commit -m "feat(game): pickNext encounter selector with no-back-to-back"
```

---

## Task 4: Stats classification + sort helpers

**Files:**
- Create: `src/game/stats.ts`
- Create: `tests/game/stats.test.ts`

Spec ref: §6.3, §6.4. Pure helpers live in `src/game/` (not `src/screens/`) so the StatsScreen renders are thin.

- [ ] **Step 1: Failing tests**

Create `tests/game/stats.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { classify, sortTraits, formatStatsRow } from "@/game/stats";
import { TRAITS } from "@/game/traits";
import type { TraitStat } from "@/game/types";

const stat = (p: number, n: number): TraitStat => ({ perfectStrips: p, nonPerfectTries: n });

describe("classify", () => {
  test("zero attempts -> no practice yet", () => {
    expect(classify(stat(0, 0))).toEqual({ flag: "⚠", label: "no practice yet", rate: null });
  });
  test("low rate -> needs practice (< 0.5)", () => {
    const r = classify(stat(2, 3));   // total 5, rate 0.4
    expect(r.flag).toBe("⚠");
    expect(r.label).toBe("needs practice");
    expect(r.rate).toBeCloseTo(0.4);
  });
  test("mid rate -> shaky (0.5 .. 0.8)", () => {
    const r = classify(stat(7, 3));   // total 10, rate 0.7
    expect(r.flag).toBe(" ");
    expect(r.label).toBe("shaky");
  });
  test("high rate -> strong (>= 0.8)", () => {
    const r = classify(stat(9, 1));   // total 10, rate 0.9
    expect(r.flag).toBe(" ");
    expect(r.label).toBe("strong");
  });
  test("statistical floor: total < 3 with high rate is still needs practice", () => {
    const r = classify(stat(2, 0));   // total 2, would be 1.0, but < 3 attempts
    expect(r.label).toBe("needs practice");
    expect(r.flag).toBe("⚠");
  });
});

describe("sortTraits", () => {
  test("orders no-practice -> needs -> shaky -> strong, ascending rate within each band", () => {
    const stats: Record<string, TraitStat> = {
      LITERAL:       stat(9, 1),     // strong (0.9)
      ANCHOR_START:  stat(7, 3),     // shaky (0.7)
      QUANT_PLUS:    stat(2, 3),     // needs (0.4)
      ESCAPE:        stat(0, 0),     // no practice
      QUANT_OPTIONAL: stat(1, 4),    // needs (0.2) — should come before QUANT_PLUS
    };
    const rows = sortTraits(stats, TRAITS);
    const order = rows.map((r) => r.trait);
    // Every untracked trait counts as "no practice" and floats up alongside ESCAPE,
    // but among the seeded ones, the order within the no-practice block is stable
    // (insertion order from the TRAITS array). Verify pairwise relations instead.
    const idx = (t: string) => order.indexOf(t);
    expect(idx("ESCAPE")).toBeLessThan(idx("QUANT_OPTIONAL"));      // no-practice before needs
    expect(idx("QUANT_OPTIONAL")).toBeLessThan(idx("QUANT_PLUS"));   // worst-needs first
    expect(idx("QUANT_PLUS")).toBeLessThan(idx("ANCHOR_START"));    // needs before shaky
    expect(idx("ANCHOR_START")).toBeLessThan(idx("LITERAL"));        // shaky before strong
  });

  test("untracked traits show as no-practice", () => {
    const rows = sortTraits({}, TRAITS);
    expect(rows).toHaveLength(TRAITS.length);
    expect(rows.every((r) => r.row.label === "no practice yet")).toBe(true);
  });
});

describe("formatStatsRow", () => {
  test("no-practice row omits percentage", () => {
    const r = classify(stat(0, 0));
    const out = formatStatsRow("ESCAPE", r);
    expect(out).toContain("ESCAPE");
    expect(out).toContain("no practice yet");
    expect(out).not.toContain("%");
  });
  test("strong row shows percentage", () => {
    const r = classify(stat(9, 1));
    const out = formatStatsRow("LITERAL", r);
    expect(out).toContain("LITERAL");
    expect(out).toContain("90%");
    expect(out).toContain("strong");
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `bun test tests/game/stats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/game/stats.ts`:

```ts
import type { Trait } from "./traits";
import type { TraitStat } from "./types";

export type Classified = {
  flag: string;        // "⚠" or " "
  label: "no practice yet" | "needs practice" | "shaky" | "strong";
  rate: number | null; // null when total === 0
};

const STATISTICAL_FLOOR = 3;

export function classify(stat: TraitStat): Classified {
  const total = stat.perfectStrips + stat.nonPerfectTries;
  if (total === 0) {
    return { flag: "⚠", label: "no practice yet", rate: null };
  }
  const rate = stat.perfectStrips / total;
  if (total < STATISTICAL_FLOOR) {
    return { flag: "⚠", label: "needs practice", rate };
  }
  if (rate < 0.5) return { flag: "⚠", label: "needs practice", rate };
  if (rate < 0.8) return { flag: " ", label: "shaky", rate };
  return { flag: " ", label: "strong", rate };
}

export type StatsRow = { trait: Trait; stat: TraitStat; row: Classified };

const BAND_ORDER: Record<Classified["label"], number> = {
  "no practice yet": 0,
  "needs practice": 1,
  "shaky": 2,
  "strong": 3,
};

export function sortTraits(
  stats: Record<string, TraitStat>,
  allTraits: readonly Trait[],
): StatsRow[] {
  const rows: StatsRow[] = allTraits.map((t) => {
    const stat = stats[t] ?? { perfectStrips: 0, nonPerfectTries: 0 };
    return { trait: t, stat, row: classify(stat) };
  });
  rows.sort((a, b) => {
    const bandDelta = BAND_ORDER[a.row.label] - BAND_ORDER[b.row.label];
    if (bandDelta !== 0) return bandDelta;
    // Within band, sort ascending by rate (worst first).
    const ar = a.row.rate ?? -1;
    const br = b.row.rate ?? -1;
    return ar - br;
  });
  return rows;
}

const TRAIT_COL_WIDTH = 18;
const COUNT_COL_WIDTH = 8;

export function formatStatsRow(trait: Trait, c: Classified): string {
  // We don't have raw counts in Classified — caller-side: a higher-fidelity
  // formatter is in StatsScreen.tsx. This standalone helper is for testing
  // the visible parts (label, percentage) reproducibly.
  const traitCol = trait.padEnd(TRAIT_COL_WIDTH);
  const pct = c.rate === null ? "" : `${Math.round(c.rate * 100)}%`;
  return `${c.flag} ${traitCol} ${pct.padStart(4)}   ${c.label}`;
}
```

- [ ] **Step 4: Run, expect pass**

Run: `bun test tests/game/stats.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/stats.ts tests/game/stats.test.ts
git commit -m "feat(game): stats classify/sort/format helpers"
```

---

# Phase 2 — Validator updates

## Task 5: Validator additions

**Files:**
- Modify: `scripts/validate-content.ts`
- Modify: `tests/scripts/validate-content.test.ts`

Spec ref: §8.5.

- [ ] **Step 1: Replace test file**

Create `tests/scripts/validate-content.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { validateChapter, validateMonster, type ValidationIssue } from "@/../scripts/validate-content";
import type { Chapter, Monster } from "@/game/types";

const okChapter: Chapter = {
  id: "test", title: "Test", intro: "", cheatsheet: [],
  monsters: [
    {
      id: "m", name: "M", portrait: "p", flavor: "",
      pool: "story", traits: ["LITERAL"],
      layers: [
        {
          topic: "t", traits: ["LITERAL"],
          lines: [
            { text: "alpha", vital: true },
            { text: "beta",  vital: true },
            { text: "noise", vital: false },
            { text: "https://example.com", vital: false },
          ],
        },
      ],
      heart: { text: "HEART_X1" },
    },
  ],
};

describe("validateChapter — v1 checks still apply", () => {
  test("good chapter has no issues", () => {
    expect(validateChapter(okChapter)).toEqual([]);
  });
  test("layer with no vitals fails", () => {
    const bad: Chapter = structuredClone(okChapter);
    bad.monsters[0]!.layers[0]!.lines.forEach((l) => (l.vital = false));
    const issues = validateChapter(bad);
    expect(issues.some((i: ValidationIssue) => i.code === "no-vitals")).toBe(true);
  });
});

describe("validateMonster — v2 trait/pool checks", () => {
  test("monster with no traits fails", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.traits = [];
    expect(validateMonster(m).some((i) => i.code === "monster-no-traits")).toBe(true);
  });

  test("layer with no traits fails", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.layers[0]!.traits = [];
    expect(validateMonster(m).some((i) => i.code === "layer-no-traits")).toBe(true);
  });

  test("layer trait not in monster traits fails", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.layers[0]!.traits = ["ANCHOR_END"]; // not declared on monster
    expect(validateMonster(m).some((i) => i.code === "layer-trait-not-in-monster")).toBe(true);
  });

  test("missing pool fails", () => {
    const m = structuredClone(okChapter.monsters[0]!);
    delete (m as Partial<Monster>).pool;
    expect(validateMonster(m as Monster).some((i) => i.code === "missing-pool")).toBe(true);
  });

  test("tutorial monster skips trivial-killer check", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.pool = "tutorial";
    // construct a layer that would normally fail trivial-killer (every line vital)
    m.layers[0]!.lines = [{ text: "a", vital: true }, { text: "b", vital: true }];
    const issues = validateMonster(m);
    expect(issues.some((i) => i.code === "trivial-killer")).toBe(false);
  });

  test("tutorial monster missing coaching emits warning, not error", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.pool = "tutorial";
    delete m.coaching;
    const issues = validateMonster(m);
    const w = issues.find((i) => i.code === "tutorial-missing-coaching");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warn");
  });

  test("non-tutorial monster with coaching emits warning", () => {
    const m: Monster = structuredClone(okChapter.monsters[0]!);
    m.coaching = "leftover";
    const issues = validateMonster(m);
    expect(issues.some((i) => i.code === "coaching-on-non-tutorial")).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `bun test tests/scripts/validate-content.test.ts`
Expected: FAIL — `validateMonster` not exported, new codes not present, etc.

- [ ] **Step 3: Replace `scripts/validate-content.ts`**

```ts
#!/usr/bin/env bun
import type { Chapter, Monster } from "../src/game/types";
import { TRAIT_SET } from "../src/game/traits";

export type Severity = "error" | "warn";

export type ValidationIssue = {
  monsterId?: string;
  layerIdx?: number;
  severity: Severity;
  code:
    | "no-layers"
    | "no-vitals"
    | "layer-too-large"
    | "trivial-heart"
    | "trivial-killer"
    | "monster-no-traits"
    | "layer-no-traits"
    | "layer-trait-not-in-monster"
    | "unknown-trait"
    | "missing-pool"
    | "tutorial-missing-coaching"
    | "coaching-on-non-tutorial";
  message: string;
};

const TRIVIAL_PATTERNS = [".*", ".+", "\\w+", "\\S+"];

export function validateChapter(chapter: Chapter): ValidationIssue[] {
  return chapter.monsters.flatMap((m) => validateMonster(m));
}

export function validateMonster(m: Monster): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // v2: pool
  if (!m.pool) {
    issues.push({ monsterId: m.id, severity: "error", code: "missing-pool", message: "monster missing pool" });
  }

  // v2: traits on monster
  if (!Array.isArray(m.traits) || m.traits.length === 0) {
    issues.push({ monsterId: m.id, severity: "error", code: "monster-no-traits", message: "monster has no traits" });
  } else {
    for (const t of m.traits) {
      if (!TRAIT_SET.has(t)) {
        issues.push({ monsterId: m.id, severity: "error", code: "unknown-trait", message: `unknown trait "${t}"` });
      }
    }
  }

  // v2: coaching field rules
  if (m.pool === "tutorial" && (m.coaching === undefined || m.coaching.trim() === "")) {
    issues.push({ monsterId: m.id, severity: "warn", code: "tutorial-missing-coaching", message: "tutorial monster has no coaching text" });
  }
  if (m.pool !== "tutorial" && m.coaching !== undefined) {
    issues.push({ monsterId: m.id, severity: "error", code: "coaching-on-non-tutorial", message: "non-tutorial monster should not set coaching" });
  }

  // v1 checks (preserved)
  if (m.layers.length === 0) {
    issues.push({ monsterId: m.id, severity: "error", code: "no-layers", message: "monster has no layers" });
    return issues;
  }
  if (m.heart.text.length < 3 || /^(.)\1+$/.test(m.heart.text)) {
    issues.push({ monsterId: m.id, severity: "error", code: "trivial-heart", message: `heart "${m.heart.text}" too trivial` });
  }
  m.layers.forEach((layer, idx) => {
    if (layer.lines.length > 8) {
      issues.push({ monsterId: m.id, layerIdx: idx, severity: "error", code: "layer-too-large", message: `${layer.lines.length} lines > 8` });
    }
    const vitalCount = layer.lines.filter((l) => l.vital).length;
    if (vitalCount === 0) {
      issues.push({ monsterId: m.id, layerIdx: idx, severity: "error", code: "no-vitals", message: "no vital lines in layer" });
    }

    // v2: layer traits (non-empty + subset)
    if (!Array.isArray(layer.traits) || layer.traits.length === 0) {
      issues.push({ monsterId: m.id, layerIdx: idx, severity: "error", code: "layer-no-traits", message: "layer has no traits" });
    } else {
      const monsterTraitSet = new Set(m.traits);
      for (const t of layer.traits) {
        if (!TRAIT_SET.has(t)) {
          issues.push({ monsterId: m.id, layerIdx: idx, severity: "error", code: "unknown-trait", message: `unknown trait "${t}"` });
        } else if (!monsterTraitSet.has(t)) {
          issues.push({ monsterId: m.id, layerIdx: idx, severity: "error", code: "layer-trait-not-in-monster", message: `layer trait "${t}" not declared on monster` });
        }
      }
    }

    // v1: trivial-killer (skipped for tutorial pool)
    if (m.pool !== "tutorial" && vitalCount > 0) {
      const trivialBeats = TRIVIAL_PATTERNS.some((p) => {
        const re = new RegExp(p, "u");
        let hits = 0;
        let collateral = 0;
        for (const line of layer.lines) {
          if (re.test(line.text)) {
            line.vital ? hits++ : collateral++;
          }
        }
        return hits === vitalCount && collateral === 0;
      });
      if (trivialBeats) {
        issues.push({
          monsterId: m.id, layerIdx: idx, severity: "error", code: "trivial-killer",
          message: `a trivial regex (one of ${TRIVIAL_PATTERNS.join(", ")}) clean-strips this layer`,
        });
      }
    }
  });

  return issues;
}

async function main(): Promise<void> {
  const mod = await import("../src/content");
  const allMonsters: Monster[] = mod.allMonsters;
  const all = allMonsters.flatMap((m) => validateMonster(m).map((i) => ({ pool: m.pool, ...i })));
  const errors = all.filter((i) => i.severity === "error");
  const warnings = all.filter((i) => i.severity === "warn");
  if (errors.length === 0) {
    console.log(`✓ ${allMonsters.length} monster(s) validated, ${warnings.length} warning(s).`);
    for (const w of warnings) console.warn(`! [${w.pool}/${w.monsterId ?? "?"}/L${w.layerIdx ?? "?"}] ${w.code}: ${w.message}`);
    return;
  }
  for (const i of all) {
    const tag = i.severity === "error" ? "✗" : "!";
    console.error(`${tag} [${i.pool}/${i.monsterId ?? "?"}/L${i.layerIdx ?? "?"}] ${i.code}: ${i.message}`);
  }
  process.exit(1);
}

if (import.meta.main) {
  main();
}
```

Note: this script's `main()` imports `../src/content` (an `index.ts` that gets created in Task 6 / Task 9). Until then, running `bun run validate-content` will fail. The validator's `validateMonster` / `validateChapter` exports are still individually testable via `bun test tests/scripts/validate-content.test.ts`.

- [ ] **Step 4: Run targeted test, expect pass**

Run: `bun test tests/scripts/validate-content.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-content.ts tests/scripts/validate-content.test.ts
git commit -m "feat(content): validator additions for v2 (traits, pool, coaching)"
```

(Full `bun run validate-content` is still red because content files haven't been updated yet. Continue.)

---

# Phase 3 — Content migration

## Task 6: Trait-tag the 12 existing story monsters

**Files:**
- Modify: `src/content/chapter-1-literals.ts`
- Modify: `src/content/chapter-2-charclasses.ts`
- Modify: `src/content/chapter-3-quantifiers.ts`

Spec ref: §8.1.

- [ ] **Step 1: Replace `src/content/chapter-1-literals.ts`**

```ts
import type { Chapter } from "@/game/types";

export const chapter: Chapter = {
  id: "literals-anchors",
  title: "Literals & Anchors",
  intro: "First steps: match exact text, use ^ and $ to pin where you mean.",
  cheatsheet: [
    "abc       matches the literal text 'abc'",
    "^abc      matches 'abc' only at line start",
    "abc$      matches 'abc' only at line end",
    "^abc$     matches lines that are exactly 'abc'",
    "a|b       matches 'a' or 'b'",
    "(...)     groups; useful with |",
  ],
  monsters: [
    {
      id: "scribblet",
      name: "Scribblet the Inkblot",
      portrait: "scribblet",
      pool: "story",
      flavor: "Type a regex below. Press [?] for help, [esc] to flee. Keys are live — every keystroke counts.",
      traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END"],
      layers: [
        {
          topic: "exact words",
          traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END"],
          lines: [
            { text: "hello",        vital: true  },
            { text: "world",        vital: true  },
            { text: "hello world",  vital: false },
            { text: "say hello",    vital: false },
          ],
        },
      ],
      heart: { text: "INK_HEART_42" },
    },
    {
      id: "caretling",
      name: "Caretling",
      portrait: "caretling",
      pool: "story",
      flavor: "Loves pretending it owns the start of every line.",
      traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END"],
      layers: [
        {
          topic: "anchored start",
          traits: ["ANCHOR_START", "LITERAL"],
          lines: [
            { text: "alpha",       vital: true  },
            { text: "alphabet",    vital: false },
            { text: "Italphabet",  vital: false },
            { text: "alpine",      vital: true  },
          ],
        },
        {
          topic: "anchored end",
          traits: ["ANCHOR_END", "LITERAL"],
          lines: [
            { text: "running",     vital: true  },
            { text: "swimming",    vital: true  },
            { text: "ringing",     vital: false },
            { text: "ingredient",  vital: false },
          ],
        },
      ],
      heart: { text: "ANCHOR_LORD_007" },
    },
    {
      id: "pinmeister",
      name: "Pinmeister",
      portrait: "pinmeister",
      pool: "story",
      flavor: "Demands you pin it exactly.",
      traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END", "ALTERNATION"],
      layers: [
        {
          topic: "exact lines",
          traits: ["ANCHOR_START", "ANCHOR_END", "LITERAL", "ALTERNATION"],
          lines: [
            { text: "ok",          vital: true  },
            { text: "go",          vital: true  },
            { text: "okay",        vital: false },
            { text: "going",       vital: false },
            { text: "stop",        vital: false },
          ],
        },
        {
          topic: "exact lines harder",
          traits: ["ANCHOR_START", "ANCHOR_END", "LITERAL", "ALTERNATION"],
          lines: [
            { text: "north",       vital: true  },
            { text: "south",       vital: true  },
            { text: "northwest",   vital: false },
            { text: "southbound",  vital: false },
          ],
        },
      ],
      heart: { text: "PIN_OF_DOOM" },
    },
    {
      id: "alternaut",
      name: "Alternaut",
      portrait: "alternaut",
      pool: "story",
      flavor: "Splits in two — match either half cleanly.",
      traits: ["LITERAL", "ALTERNATION", "GROUP"],
      layers: [
        {
          topic: "alternation",
          traits: ["ALTERNATION", "LITERAL"],
          lines: [
            { text: "cat",         vital: true  },
            { text: "dog",         vital: true  },
            { text: "catalog",     vital: false },
            { text: "dogged",      vital: false },
            { text: "horse",       vital: false },
          ],
        },
        {
          topic: "grouped alternation",
          traits: ["ALTERNATION", "GROUP", "LITERAL"],
          lines: [
            { text: "v1",          vital: true  },
            { text: "v2",          vital: true  },
            { text: "v3",          vital: true  },
            { text: "v10",         vital: false },
            { text: "verse",       vital: false },
          ],
        },
      ],
      heart: { text: "ALT_FUSION_X" },
    },
  ],
};
```

- [ ] **Step 2: Replace `src/content/chapter-2-charclasses.ts`**

```ts
import type { Chapter } from "@/game/types";

export const chapter: Chapter = {
  id: "char-classes",
  title: "Character Classes",
  intro: "Letters, digits, whitespace, ranges. Stop spelling everything out.",
  cheatsheet: [
    "\\d  any digit       \\D  non-digit",
    "\\w  word char       \\W  non-word",
    "\\s  whitespace      \\S  non-ws",
    "[abc]  any of a,b,c  [^abc]  none of",
    "[a-z]  range",
  ],
  monsters: [
    {
      id: "digiton",
      name: "Digiton",
      portrait: "digiton",
      pool: "story",
      flavor: "Made entirely of digits. Ironic, isn't it.",
      traits: ["CHAR_CLASS_DIGIT", "QUANT_PLUS", "QUANT_EXACT"],
      layers: [
        {
          topic: "digits only",
          traits: ["CHAR_CLASS_DIGIT", "QUANT_PLUS"],
          lines: [
            { text: "404",         vital: true  },
            { text: "200",         vital: true  },
            { text: "3.14",        vital: false },
            { text: "v3",          vital: false },
            { text: "abc",         vital: false },
          ],
        },
        {
          topic: "longer digit runs",
          traits: ["CHAR_CLASS_DIGIT", "QUANT_EXACT"],
          lines: [
            { text: "8675309",     vital: true  },
            { text: "1024",        vital: true  },
            { text: "x42",         vital: false },
            { text: "12-12",       vital: false },
          ],
        },
      ],
      heart: { text: "DIGIT_BOSS_99" },
    },
    {
      id: "worderly",
      name: "Worderly",
      portrait: "worderly",
      pool: "story",
      flavor: "Fond of underscores. Probably writes Python.",
      traits: ["CHAR_CLASS_WORD", "QUANT_PLUS"],
      layers: [
        {
          topic: "word chars",
          traits: ["CHAR_CLASS_WORD", "QUANT_PLUS"],
          lines: [
            { text: "snake_case",  vital: true  },
            { text: "camelCase",   vital: true  },
            { text: "kebab-case",  vital: false },
            { text: "spaced out",  vital: false },
            { text: "punct!",      vital: false },
          ],
        },
        {
          topic: "non-word chars",
          traits: ["CHAR_CLASS_WORD", "QUANT_PLUS"],
          lines: [
            { text: "@#!$",        vital: true  },
            { text: "...",         vital: true  },
            { text: "abc",         vital: false },
            { text: "ab_cd",       vital: false },
          ],
        },
      ],
      heart: { text: "WORD_SOUL_X" },
    },
    {
      id: "spaceblob",
      name: "Spaceblob",
      portrait: "spaceblob",
      pool: "story",
      flavor: "Soft, breathy, full of nothing.",
      traits: ["CHAR_CLASS_SPACE", "ANCHOR_START", "QUANT_PLUS"],
      layers: [
        {
          topic: "leading whitespace",
          traits: ["CHAR_CLASS_SPACE", "ANCHOR_START"],
          lines: [
            { text: "    indented",      vital: true  },
            { text: "\tindented",        vital: true  },
            { text: "no_indent",         vital: false },
            { text: "x   trailing   ",   vital: false },
          ],
        },
        {
          topic: "non-whitespace runs",
          traits: ["CHAR_CLASS_SPACE", "QUANT_PLUS"],
          lines: [
            { text: "abc",               vital: true  },
            { text: "xyz123",            vital: true  },
            { text: "  spaces  inside",  vital: false },
            { text: "  ",                vital: false },
          ],
        },
      ],
      heart: { text: "VOID_TOKEN" },
    },
    {
      id: "rangewolf",
      name: "Rangewolf",
      portrait: "rangewolf",
      pool: "story",
      flavor: "Hunts in lowercase territory.",
      traits: ["CHAR_CLASS_RANGE", "CHAR_CLASS_SET", "QUANT_PLUS"],
      layers: [
        {
          topic: "lowercase only",
          traits: ["CHAR_CLASS_RANGE", "QUANT_PLUS"],
          lines: [
            { text: "lowercase",       vital: true  },
            { text: "another",         vital: true  },
            { text: "Capitalized",     vital: false },
            { text: "MIXED1",          vital: false },
            { text: "x42",             vital: false },
          ],
        },
        {
          topic: "negated set",
          traits: ["CHAR_CLASS_SET", "QUANT_PLUS"],
          lines: [
            { text: "alpha",           vital: true  },
            { text: "beta",            vital: true  },
            { text: "alpha_x",         vital: false },
            { text: "beta-99",         vital: false },
          ],
        },
      ],
      heart: { text: "RANGE_FANG_07" },
    },
  ],
};
```

- [ ] **Step 3: Replace `src/content/chapter-3-quantifiers.ts`**

```ts
import type { Chapter } from "@/game/types";

export const chapter: Chapter = {
  id: "quantifiers",
  title: "Quantifiers",
  intro: "How much, how many. *, +, ?, {n}, {n,m} — pick the right repeater.",
  cheatsheet: [
    "x*       zero or more x",
    "x+       one or more x",
    "x?       zero or one x",
    "x{n}     exactly n",
    "x{n,m}   between n and m",
    "x{n,}    at least n",
  ],
  monsters: [
    {
      id: "starfist",
      name: "Starfist",
      portrait: "starfist",
      pool: "story",
      flavor: "Hits with zero or more punches.",
      traits: ["QUANT_STAR", "LITERAL"],
      layers: [
        {
          topic: "zero-or-more",
          traits: ["QUANT_STAR", "LITERAL"],
          lines: [
            { text: "ab",          vital: true  },
            { text: "aab",         vital: true  },
            { text: "aaab",        vital: true  },
            { text: "abc",         vital: false },
            { text: "b",           vital: true  },
          ],
        },
      ],
      heart: { text: "STAR_GUTS_01" },
    },
    {
      id: "pluson",
      name: "Pluson",
      portrait: "pluson",
      pool: "story",
      flavor: "Demands at least one of you.",
      traits: ["QUANT_PLUS", "CHAR_CLASS_DIGIT", "LITERAL"],
      layers: [
        {
          topic: "one-or-more",
          traits: ["QUANT_PLUS", "CHAR_CLASS_DIGIT"],
          lines: [
            { text: "9",           vital: true  },
            { text: "42",          vital: true  },
            { text: "1234",        vital: true  },
            { text: "no digits",   vital: false },
            { text: "v3",          vital: false },
          ],
        },
        {
          topic: "longer runs",
          traits: ["QUANT_PLUS", "LITERAL"],
          lines: [
            { text: "aaaaa",       vital: true  },
            { text: "aaa",         vital: true  },
            { text: "ab",          vital: false },
            { text: "bbb",         vital: false },
          ],
        },
      ],
      heart: { text: "PLUS_CORE_55" },
    },
    {
      id: "questling",
      name: "Questling",
      portrait: "questling",
      pool: "story",
      flavor: "Optional, but oh so important.",
      traits: ["QUANT_OPTIONAL", "LITERAL", "GROUP"],
      layers: [
        {
          topic: "zero-or-one",
          traits: ["QUANT_OPTIONAL", "LITERAL"],
          lines: [
            { text: "color",       vital: true  },
            { text: "colour",      vital: true  },
            { text: "colors",      vital: false },
            { text: "colourful",   vital: false },
          ],
        },
        {
          topic: "optional groups",
          traits: ["QUANT_OPTIONAL", "GROUP", "LITERAL"],
          lines: [
            { text: "http",        vital: true  },
            { text: "https",       vital: true  },
            { text: "httpz",       vital: false },
            { text: "shttp",       vital: false },
          ],
        },
      ],
      heart: { text: "OPT_HEART_99" },
    },
    {
      id: "bracetron",
      name: "Bracetron",
      portrait: "bracetron",
      pool: "story",
      flavor: "Counts. Precisely. Don't be off by one.",
      traits: ["QUANT_EXACT", "CHAR_CLASS_WORD", "LITERAL"],
      layers: [
        {
          topic: "exact counts",
          traits: ["QUANT_EXACT", "CHAR_CLASS_WORD"],
          lines: [
            { text: "abc",         vital: true  },
            { text: "xyz",         vital: true  },
            { text: "ab",          vital: false },
            { text: "abcd",        vital: false },
            { text: "xy",          vital: false },
          ],
        },
        {
          topic: "ranged counts",
          traits: ["QUANT_EXACT", "LITERAL"],
          lines: [
            { text: "aaa",         vital: true  },
            { text: "aaaa",        vital: true  },
            { text: "aaaaa",       vital: true  },
            { text: "aa",          vital: false },
            { text: "aaaaaa",      vital: false },
          ],
        },
      ],
      heart: { text: "BRACE_HEART_3X" },
    },
  ],
};
```

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck`
Expected: errors now reduced — only `src/app.tsx` import path (`@/content/chapters` doesn't exist after Task 9) plus `chapters.ts` itself. Content files are clean.

- [ ] **Step 5: Commit (intermediate; tree still red)**

```bash
git add src/content/chapter-1-literals.ts src/content/chapter-2-charclasses.ts src/content/chapter-3-quantifiers.ts
git commit -m "feat(content): trait-tag and pool-tag the 12 story monsters"
```

---

## Task 7: Tutorial monsters (Lump, Pip, Bop)

**Files:**
- Modify: `src/content/portraits.ts`
- Create: `src/content/tutorial.ts`

Spec ref: §7.3, §8.2.

- [ ] **Step 1: Add tutorial portraits**

Replace `src/content/portraits.ts` with the existing 12 entries plus three new ones:

```ts
export const portraits: Record<string, string[]> = {
  scribblet:  ["  ,---,  ", " ( o.o ) ", "  \\___/  "],
  caretling:  ["   ^^^   ", "  /. .\\  ", "  \\___/  "],
  pinmeister: ["  |---|  ", "  | $ |  ", "  '---'  "],
  alternaut:  ["  /-|-\\  ", " ( o|o ) ", "  \\-|-/  "],
  digiton:    ["  [123]  ", "  /0 0\\  ", "  \\_8_/  "],
  worderly:   ["  {abc}  ", "  /a a\\  ", "  \\___/  "],
  spaceblob:  ["  ~~~~~  ", "  ' '    ", "         "],
  rangewolf:  ["  /a-z\\  ", " (•   •) ", "  \\___/  "],
  starfist:   ["  *_*    ", " /***\\   ", "  v v    "],
  pluson:     ["  +++    ", " (^_^)   ", "  \\_/    "],
  questling:  ["  ?_?    ", " /. .\\   ", "  \\?/    "],
  bracetron:  ["  {n,m}  ", "  /OO\\   ", "  \\__/   "],
  // tutorial
  lump:       [" .-----.", " (  ^^ )", "  '---' "],
  pip:        ["  ::: ", " ('o') ", "  \"-\"  "],
  bop:        [" /\\_/\\ ", "( o.o )", "  > <  "],
};
```

- [ ] **Step 2: Create `src/content/tutorial.ts`**

```ts
import type { Monster } from "@/game/types";

export const tutorialMonsters: Monster[] = [
  {
    id: "tut-lump",
    name: "Lump (the Literal Lump)",
    portrait: "lump",
    pool: "tutorial",
    flavor: "Hi! I'm Lump. I exist to teach you the very basics.",
    coaching: "Type a regex into the input. Highlights update on every keystroke. When your regex matches *only* the marked (♦) lines, the layer breaks. Press [?] for the cheatsheet, [esc] to flee.",
    traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END"],
    layers: [
      {
        topic: "exact words",
        traits: ["LITERAL"],
        coaching: "Try typing: hello",
        lines: [
          { text: "hello",   vital: true  },
          { text: "say hi",  vital: false },
          { text: "hellos",  vital: false },
        ],
      },
      {
        topic: "anchored line",
        traits: ["ANCHOR_START", "ANCHOR_END", "LITERAL"],
        coaching: "Now try: ^cat$  — the ^ pins the start of the line, $ pins the end.",
        lines: [
          { text: "cat",       vital: true  },
          { text: "scattered", vital: false },
          { text: "cataract",  vital: false },
        ],
      },
    ],
    heart: { text: "TUT_LUMP_HEART" },
  },
  {
    id: "tut-pip",
    name: "Pip (the Class Sprite)",
    portrait: "pip",
    pool: "tutorial",
    flavor: "I'll teach you character classes — \\d, \\w, \\s.",
    coaching: "Character classes match a TYPE of character: \\d = digit, \\w = word char (letters/digits/underscore), \\s = whitespace.",
    traits: ["CHAR_CLASS_DIGIT", "CHAR_CLASS_WORD", "CHAR_CLASS_SPACE"],
    layers: [
      {
        topic: "digits",
        traits: ["CHAR_CLASS_DIGIT"],
        coaching: "Try: ^\\d+$  — match lines that are nothing but digits.",
        lines: [
          { text: "42",     vital: true  },
          { text: "1024",   vital: true  },
          { text: "v3",     vital: false },
          { text: "ab",     vital: false },
        ],
      },
      {
        topic: "word chars",
        traits: ["CHAR_CLASS_WORD"],
        coaching: "Try: ^\\w+$  — letters, digits, underscore. No dashes or spaces.",
        lines: [
          { text: "snake_case", vital: true  },
          { text: "ABC123",     vital: true  },
          { text: "kebab-case", vital: false },
          { text: "spaces here", vital: false },
        ],
      },
      {
        topic: "whitespace",
        traits: ["CHAR_CLASS_SPACE"],
        coaching: "Try: ^\\s  — lines that START with whitespace.",
        lines: [
          { text: "  indented", vital: true  },
          { text: "\ttabbed",    vital: true  },
          { text: "flush",      vital: false },
          { text: "x   ",       vital: false },
        ],
      },
    ],
    heart: { text: "TUT_PIP_HEART" },
  },
  {
    id: "tut-bop",
    name: "Bop (the Repeater)",
    portrait: "bop",
    pool: "tutorial",
    flavor: "Let's count. Quantifiers say how many.",
    coaching: "Quantifiers attach to the previous thing: x* = 0+, x+ = 1+, x? = 0 or 1.",
    traits: ["QUANT_STAR", "QUANT_PLUS", "QUANT_OPTIONAL"],
    layers: [
      {
        topic: "zero-or-more",
        traits: ["QUANT_STAR"],
        coaching: "Try: ^a*b$  — any number of a's (including zero), then b.",
        lines: [
          { text: "b",    vital: true  },
          { text: "ab",   vital: true  },
          { text: "aab",  vital: true  },
          { text: "abc",  vital: false },
        ],
      },
      {
        topic: "one-or-more",
        traits: ["QUANT_PLUS"],
        coaching: "Try: ^a+$  — at least one a, nothing else.",
        lines: [
          { text: "a",    vital: true  },
          { text: "aaa",  vital: true  },
          { text: "",     vital: false },
          { text: "ab",   vital: false },
        ],
      },
      {
        topic: "zero-or-one",
        traits: ["QUANT_OPTIONAL"],
        coaching: "Try: ^colou?r$  — the u is optional. Both spellings match.",
        lines: [
          { text: "color",     vital: true  },
          { text: "colour",    vital: true  },
          { text: "colours",   vital: false },
          { text: "colorful",  vital: false },
        ],
      },
    ],
    heart: { text: "TUT_BOP_HEART" },
  },
];
```

- [ ] **Step 3: Validate the tutorial monsters with the new validator**

Add a quick assertion in `bun test`. We're not adding a new test file just for content — the data-driven test in Task 9 will cover all monsters. For now, manual check:

Run: `bun -e 'import("./scripts/validate-content.ts").then(({validateMonster}) => import("./src/content/tutorial.ts").then(({tutorialMonsters}) => { for (const m of tutorialMonsters) { const i = validateMonster(m); if (i.length > 0) { console.log(m.id, i); } } }))'`

Expected: prints nothing (no issues).

- [ ] **Step 4: Commit**

```bash
git add src/content/portraits.ts src/content/tutorial.ts
git commit -m "feat(content): tutorial monsters Lump, Pip, Bop with coaching"
```

---

## Task 8: One wild monster (ESCAPE practice)

**Files:**
- Create: `src/content/wild.ts`
- Modify: `src/content/portraits.ts`

Spec ref: §8.3.

- [ ] **Step 1: Add wild portrait**

Replace `src/content/portraits.ts` (keep all 15 prior entries; add `dotgrim`):

```ts
export const portraits: Record<string, string[]> = {
  scribblet:  ["  ,---,  ", " ( o.o ) ", "  \\___/  "],
  caretling:  ["   ^^^   ", "  /. .\\  ", "  \\___/  "],
  pinmeister: ["  |---|  ", "  | $ |  ", "  '---'  "],
  alternaut:  ["  /-|-\\  ", " ( o|o ) ", "  \\-|-/  "],
  digiton:    ["  [123]  ", "  /0 0\\  ", "  \\_8_/  "],
  worderly:   ["  {abc}  ", "  /a a\\  ", "  \\___/  "],
  spaceblob:  ["  ~~~~~  ", "  ' '    ", "         "],
  rangewolf:  ["  /a-z\\  ", " (•   •) ", "  \\___/  "],
  starfist:   ["  *_*    ", " /***\\   ", "  v v    "],
  pluson:     ["  +++    ", " (^_^)   ", "  \\_/    "],
  questling:  ["  ?_?    ", " /. .\\   ", "  \\?/    "],
  bracetron:  ["  {n,m}  ", "  /OO\\   ", "  \\__/   "],
  lump:       [" .-----.", " (  ^^ )", "  '---' "],
  pip:        ["  ::: ", " ('o') ", "  \"-\"  "],
  bop:        [" /\\_/\\ ", "( o.o )", "  > <  "],
  // wild
  dotgrim:    ["  ....  ", " /. .\\ ", "  \\.|.   "],
};
```

- [ ] **Step 2: Create `src/content/wild.ts`**

```ts
import type { Monster } from "@/game/types";

export const wildMonsters: Monster[] = [
  {
    id: "dotgrim",
    name: "Dotgrim",
    portrait: "dotgrim",
    pool: "wild",
    flavor: "Surrounded by punctuation. The dot is sacred and must be quoted.",
    traits: ["ESCAPE", "LITERAL", "QUANT_PLUS"],
    layers: [
      {
        topic: "literal dots",
        traits: ["ESCAPE", "LITERAL"],
        lines: [
          { text: "1.2.3",       vital: true  },
          { text: "v0.1.0",      vital: true  },
          { text: "abc",         vital: false },
          { text: "no dot here", vital: false },
        ],
      },
      {
        topic: "domains",
        traits: ["ESCAPE", "LITERAL", "QUANT_PLUS"],
        lines: [
          { text: "example.com",       vital: true  },
          { text: "regex.io",          vital: true  },
          { text: "no_domain",         vital: false },
          { text: "https://x.io/path", vital: false },
        ],
      },
    ],
    heart: { text: "DOT_HEART_2024" },
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/content/wild.ts src/content/portraits.ts
git commit -m "feat(content): wild monster Dotgrim — ESCAPE practice"
```

---

## Task 9: Content index (`src/content/index.ts`) replaces `chapters.ts`

**Files:**
- Delete: `src/content/chapters.ts`
- Create: `src/content/index.ts`
- Create: `tests/content/all-monsters.test.ts`

Spec ref: §8.4.

- [ ] **Step 1: Delete `src/content/chapters.ts`**

```bash
git rm src/content/chapters.ts
```

- [ ] **Step 2: Create `src/content/index.ts`**

```ts
import type { Chapter, Monster } from "@/game/types";
import { chapter as chapter1 } from "./chapter-1-literals";
import { chapter as chapter2 } from "./chapter-2-charclasses";
import { chapter as chapter3 } from "./chapter-3-quantifiers";
import { tutorialMonsters } from "./tutorial";
import { wildMonsters } from "./wild";

export const storyChapters: Chapter[] = [chapter1, chapter2, chapter3];
export { tutorialMonsters, wildMonsters };

export const allMonsters: Monster[] = [
  ...storyChapters.flatMap((c) => c.monsters),
  ...tutorialMonsters,
  ...wildMonsters,
];
```

- [ ] **Step 3: Replace test file**

Replace `tests/content/chapters.test.ts` with `tests/content/all-monsters.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { allMonsters, storyChapters } from "@/content";
import { validateMonster } from "@/../scripts/validate-content";

describe("all monster content passes the validator", () => {
  for (const m of allMonsters) {
    test(`${m.pool}/${m.id} passes (errors only)`, () => {
      const errors = validateMonster(m).filter((i) => i.severity === "error");
      expect(errors).toEqual([]);
    });
  }
});

describe("monster pool composition", () => {
  test("storyChapters has 3 chapters of 4 monsters each", () => {
    expect(storyChapters.length).toBe(3);
    for (const c of storyChapters) {
      expect(c.monsters.length).toBe(4);
    }
  });
  test("allMonsters covers story + tutorial + wild", () => {
    const pools = new Set(allMonsters.map((m) => m.pool));
    expect(pools.has("story")).toBe(true);
    expect(pools.has("tutorial")).toBe(true);
    expect(pools.has("wild")).toBe(true);
  });
});
```

Also delete the now-obsolete `tests/content/chapters.test.ts`:

```bash
git rm tests/content/chapters.test.ts
```

- [ ] **Step 4: Run validator + tests**

Run:
```bash
bun run validate-content
bun test
```

Expected:
- `validate-content` prints `✓ 16 monster(s) validated, 0 warning(s).` (12 story + 3 tutorial + 1 wild = 16).
- `bun test` is green except for any consumer of `@/content/chapters` (currently `src/app.tsx`). Typecheck still red until Task 11 fixes the App router.

- [ ] **Step 5: Commit**

```bash
git add src/content/index.ts tests/content/all-monsters.test.ts
git commit -m "feat(content): merge chapters/tutorial/wild into src/content/index.ts"
```

---

# Phase 4 — Hook extension

## Task 10: `useCombatEngine` learns to emit trait events

**Files:**
- Modify: `src/components/hooks/useCombatEngine.ts`

Spec ref: §3.5.

- [ ] **Step 1: Replace the hook**

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { advance, initialState, type CombatState } from "@/game/combat";
import { computeDamage } from "@/game/damage";
import { evaluate } from "@/game/matcher";
import type { EvalResult, Monster, Trait } from "@/game/types";

export type TraitEvent =
  | { kind: "perfect-strip"; layerIdx: number; traits: Trait[] }
  | { kind: "non-perfect-try"; layerIdx: number; traits: Trait[] };

export type CombatEngine = {
  state: CombatState;
  pattern: string;
  evalResult: EvalResult | null;
  damage: number;
  setPattern: (p: string) => void;
  dismissIntro: () => void;
  dismissKill: () => void;
};

export type UseCombatEngineOpts = {
  monster: Monster;
  stripDelayMs?: number;
  onTraitEvent?: (e: TraitEvent) => void;
};

export function useCombatEngine(opts: UseCombatEngineOpts): CombatEngine {
  const stripDelayMs = opts.stripDelayMs ?? 400;

  const [state, setState] = useState<CombatState>(() => initialState(opts.monster));
  const [pattern, setPattern] = useState("");

  // Per-layer-life dedup state for non-perfect-try events.
  // Reset whenever the active layer changes (or we leave layerActive).
  const seenNonPerfectKey = useRef<Set<string>>(new Set());
  const seenNonPerfectTraits = useRef<Set<Trait>>(new Set());
  const lastLayerKey = useRef<string>("");

  const evalResult = useMemo<EvalResult | null>(() => {
    if (state.phase.kind === "layerActive" || state.phase.kind === "heart") {
      return evaluate({ pattern, monster: opts.monster, phase: state.phase });
    }
    return null;
  }, [pattern, state.phase, opts.monster]);

  const damage = useMemo(() => {
    if (!evalResult) return 0;
    return computeDamage({
      vitalsHit: evalResult.vitalsHit,
      vitalsTotal: evalResult.vitalsTotal,
      collateral: evalResult.collateral,
    });
  }, [evalResult]);

  // Reset per-layer-life dedup when the active layer changes.
  useEffect(() => {
    const key =
      state.phase.kind === "layerActive" ? `L${state.phase.layerIdx}` :
      state.phase.kind === "heart"        ? `H` :
      "";
    if (key !== lastLayerKey.current) {
      lastLayerKey.current = key;
      seenNonPerfectKey.current = new Set();
      seenNonPerfectTraits.current = new Set();
    }
  }, [state.phase]);

  // Fire trait events: perfect-strip on perfect; non-perfect-try on novel imperfect patterns.
  useEffect(() => {
    if (!evalResult) return;
    const onTraitEvent = opts.onTraitEvent;
    if (!onTraitEvent) return;

    if (state.phase.kind === "layerActive") {
      const layer = opts.monster.layers[state.phase.layerIdx];
      if (!layer) return;

      if (evalResult.perfect) {
        // Perfect-strip event for this layer's traits.
        onTraitEvent({ kind: "perfect-strip", layerIdx: state.phase.layerIdx, traits: layer.traits });
        return;
      }
      // Non-perfect: dedup by (pattern, trait) within the current layer-life.
      if (pattern === "" || evalResult.invalid) return;
      if (seenNonPerfectKey.current.has(pattern)) return;
      seenNonPerfectKey.current.add(pattern);
      const novelTraits = layer.traits.filter((t) => !seenNonPerfectTraits.current.has(t));
      if (novelTraits.length === 0) return;
      for (const t of novelTraits) seenNonPerfectTraits.current.add(t);
      onTraitEvent({ kind: "non-perfect-try", layerIdx: state.phase.layerIdx, traits: novelTraits });
    }
    // Heart phase: no per-trait events for v2 (heart uses the monster's union — recorded via recordKill instead).
  }, [evalResult, pattern, state.phase, opts.monster, opts.onTraitEvent]);

  // Advance state on perfect (layer or heart).
  useEffect(() => {
    if (!evalResult || !evalResult.perfect) return;
    setState((s) => advance(s, { kind: "perfectMatch", pattern }));
  }, [evalResult, pattern]);

  // Strip animation timer.
  useEffect(() => {
    if (state.phase.kind !== "strip") return;
    const handle = setTimeout(() => {
      setState((s) => advance(s, { kind: "stripDone" }));
      setPattern("");
    }, stripDelayMs);
    return () => clearTimeout(handle);
  }, [state.phase, stripDelayMs]);

  const dismissIntro = useCallback(() => setState((s) => advance(s, { kind: "dismissIntro" })), []);
  const dismissKill = useCallback(() => setState((s) => advance(s, { kind: "dismissKill" })), []);

  return { state, pattern, evalResult, damage, setPattern, dismissIntro, dismissKill };
}
```

- [ ] **Step 2: Run typecheck + test**

Run: `bun run typecheck && bun test`
Expected: typecheck clean for the hook (consumers in screens still need updating). Tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/hooks/useCombatEngine.ts
git commit -m "feat(ui): useCombatEngine emits onTraitEvent (perfect-strip + dedup non-perfect-try)"
```

---

# Phase 5 — Screens

## Task 11: Rename `ChapterSelectScreen` → `StorySelectScreen` (history-preserving)

**Files:**
- Move: `src/screens/ChapterSelectScreen.tsx` → `src/screens/StorySelectScreen.tsx`
- Move: `tests/screens/ChapterSelectScreen.test.ts` → `tests/screens/StorySelectScreen.test.ts`

Spec ref: §4.3.

- [ ] **Step 1: Rename via git mv (preserves history)**

```bash
git mv src/screens/ChapterSelectScreen.tsx src/screens/StorySelectScreen.tsx
git mv tests/screens/ChapterSelectScreen.test.ts tests/screens/StorySelectScreen.test.ts
```

- [ ] **Step 2: Update internal symbol names**

Edit `src/screens/StorySelectScreen.tsx`:
- Rename component and props: `ChapterSelectScreen` → `StorySelectScreen`, `ChapterSelectProps` → `StorySelectProps`.
- All other code is unchanged.

Top of the file becomes:
```tsx
import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import type { Chapter, SaveFile } from "@/game/types";

export type StorySelectProps = {
  chapters: Chapter[];
  save: SaveFile;
  onPickMonster: (chapterId: string, monsterId: string) => void;
  onBack: () => void;
};
```

(Function name and trailing export use `StorySelectScreen`.)

- [ ] **Step 3: Update test imports**

Edit `tests/screens/StorySelectScreen.test.ts` import:
```ts
import { hasAnySlain, isSlain, isChapterUnlocked } from "@/screens/StorySelectScreen";
```

- [ ] **Step 4: Verify typecheck/test (still red on app.tsx)**

Run: `bun run typecheck && bun test`
Expected: tests for the renamed screen pass; `src/app.tsx` is still broken (Task 16 fixes it).

- [ ] **Step 5: Commit (rename only, behaviour unchanged)**

```bash
git add src/screens/StorySelectScreen.tsx tests/screens/StorySelectScreen.test.ts
git commit -m "refactor(screens): rename ChapterSelectScreen to StorySelectScreen"
```

---

## Task 12: `EncounterIntroScreen`

**Files:**
- Create: `src/screens/EncounterIntroScreen.tsx`

Spec ref: §5.1, §5.5.

- [ ] **Step 1: Create the screen**

```tsx
import React from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";

export type EncounterIntroProps = {
  onBegin: () => void;
  onBack: () => void;
};

export function EncounterIntroScreen({ onBegin, onBack }: EncounterIntroProps): React.ReactElement {
  useKeyboard((e: KeyEvent) => {
    if (e.name === "return") onBegin();
    else if (e.name === "escape") onBack();
  }, { global: true });

  return (
    <box flexDirection="column" padding={2} gap={1}>
      <text>WILD ENCOUNTER MODE</text>
      <text>───────────────────</text>
      <text>Random monsters from the wild + story pools.</text>
      <text>Slay one and the next appears immediately.</text>
      <text>[esc] flees back to main menu.</text>
      <text> </text>
      <text>[⏎] begin     [esc] back</text>
    </box>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/screens/EncounterIntroScreen.tsx
git commit -m "feat(screens): EncounterIntroScreen"
```

---

## Task 13: `EncounterVictoryScreen`

**Files:**
- Create: `src/screens/EncounterVictoryScreen.tsx`

Spec ref: §5.4.

- [ ] **Step 1: Create the screen**

```tsx
import React, { useEffect } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";

export type EncounterVictoryProps = {
  monsterName: string;
  sessionNumber: number;       // save.encounterSessions
  killNumberInSession: number; // 1-based count of kills since the player entered this session
  onAdvance: () => void;
  onBack: () => void;
  /** Auto-advance after this many ms unless the user presses a key. Tests pass 1. */
  autoAdvanceMs?: number;
};

export function EncounterVictoryScreen(props: EncounterVictoryProps): React.ReactElement {
  const { monsterName, sessionNumber, killNumberInSession, onAdvance, onBack, autoAdvanceMs = 1500 } = props;

  useKeyboard((e: KeyEvent) => {
    if (e.name === "escape") onBack();
    else onAdvance();
  }, { global: true });

  useEffect(() => {
    const handle = setTimeout(onAdvance, autoAdvanceMs);
    return () => clearTimeout(handle);
  }, [autoAdvanceMs, onAdvance]);

  return (
    <box flexDirection="column" padding={2} gap={1} alignItems="center">
      <text>SLAIN</text>
      <text>{monsterName}</text>
      <text>───────────────</text>
      <text>Encounter #{sessionNumber} · kill {killNumberInSession} of this session</text>
      <text> </text>
      <text>any key advances · [esc] main menu</text>
    </box>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/screens/EncounterVictoryScreen.tsx
git commit -m "feat(screens): EncounterVictoryScreen with auto-advance timer"
```

---

## Task 14: `TutorialSelectScreen`

**Files:**
- Create: `src/screens/TutorialSelectScreen.tsx`

Spec ref: §7.4.

- [ ] **Step 1: Create the screen**

```tsx
import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import type { Monster } from "@/game/types";

export type TutorialSelectProps = {
  monsters: Monster[];
  onPick: (monsterId: string) => void;
  onBack: () => void;
};

export function TutorialSelectScreen({ monsters, onPick, onBack }: TutorialSelectProps): React.ReactElement {
  const [idx, setIdx] = useState(0);

  useKeyboard((e: KeyEvent) => {
    if (monsters.length === 0) {
      if (e.name === "escape") onBack();
      return;
    }
    if (e.name === "up") setIdx((i) => (i + monsters.length - 1) % monsters.length);
    else if (e.name === "down") setIdx((i) => (i + 1) % monsters.length);
    else if (e.name === "return") onPick(monsters[idx]!.id);
    else if (e.name === "escape") onBack();
  }, { global: true });

  return (
    <box flexDirection="column" padding={1} gap={0}>
      <text>Tutorial — pick a teacher  ([esc] back)</text>
      <text>──────────────────────────────────────</text>
      {monsters.map((m, i) => (
        <text key={m.id}>{i === idx ? "▶ " : "  "}{m.name}</text>
      ))}
      <text> </text>
      <text>(tutorials are replayable; they don't track progress or feed stats)</text>
    </box>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/screens/TutorialSelectScreen.tsx
git commit -m "feat(screens): TutorialSelectScreen"
```

---

## Task 15: `StatsScreen`

**Files:**
- Create: `src/screens/StatsScreen.tsx`
- Create: `tests/screens/StatsScreen.test.ts`

Spec ref: §6.

- [ ] **Step 1: Failing tests for the screen-level helpers**

Create `tests/screens/StatsScreen.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { renderStatsRowText } from "@/screens/StatsScreen";
import type { TraitStat } from "@/game/types";

describe("renderStatsRowText", () => {
  test("no-practice row omits percentage and shows 0/0", () => {
    const out = renderStatsRowText("ESCAPE", { perfectStrips: 0, nonPerfectTries: 0 });
    expect(out).toContain("ESCAPE");
    expect(out).toContain("0/0");
    expect(out).toContain("no practice yet");
    expect(out).not.toContain("%");
  });

  test("strong row shows perfectStrips/total and percentage", () => {
    const stat: TraitStat = { perfectStrips: 9, nonPerfectTries: 1 };
    const out = renderStatsRowText("LITERAL", stat);
    expect(out).toContain("9/10");
    expect(out).toContain("90%");
    expect(out).toContain("strong");
  });

  test("statistical-floor row labels needs-practice", () => {
    const stat: TraitStat = { perfectStrips: 1, nonPerfectTries: 0 };
    const out = renderStatsRowText("GROUP", stat);
    expect(out).toContain("1/1");
    expect(out).toContain("needs practice");
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `bun test tests/screens/StatsScreen.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the screen**

Create `src/screens/StatsScreen.tsx`:

```tsx
import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { TRAITS } from "@/game/traits";
import { classify, sortTraits } from "@/game/stats";
import type { SaveFile, TraitStat } from "@/game/types";
import type { Trait } from "@/game/traits";

export type StatsScreenProps = {
  save: SaveFile;
  onReset: () => void;       // caller wires resetStats + setSave
  onBack: () => void;
};

const TRAIT_COL = 18;

/** Pure renderer for one row — exported for testing. */
export function renderStatsRowText(trait: Trait, stat: TraitStat): string {
  const c = classify(stat);
  const total = stat.perfectStrips + stat.nonPerfectTries;
  const counts = `${stat.perfectStrips}/${total}`;
  const pct = c.rate === null ? "    " : `${Math.round(c.rate * 100).toString().padStart(3)}%`;
  return `${c.flag} ${trait.padEnd(TRAIT_COL)} ${counts.padEnd(8)} ${pct}   ${c.label}`;
}

export function StatsScreen({ save, onReset, onBack }: StatsScreenProps): React.ReactElement {
  const [confirming, setConfirming] = useState(false);

  useKeyboard((e: KeyEvent) => {
    if (confirming) {
      if (e.name === "y") {
        setConfirming(false);
        onReset();
      } else {
        setConfirming(false);
      }
      return;
    }
    if (e.name === "r") setConfirming(true);
    else if (e.name === "escape") onBack();
  }, { global: true });

  const rows = sortTraits(save.traitStats, TRAITS);
  const total = save.storyKills + save.encounterKills;

  return (
    <box flexDirection="column" padding={1} gap={0}>
      <text>STATS  ([esc] back)</text>
      <text>───────────────────</text>
      <text>Lifetime: {total} monsters slain (story {save.storyKills} · encounter {save.encounterKills})</text>
      <text>Sessions: {save.encounterSessions} encounter runs</text>
      <text> </text>
      <text>Trait practice (sorted: needs-practice → strong)</text>
      <text>─────────────────────────────────────────────────</text>
      {rows.map((r) => (
        <text key={r.trait}>{renderStatsRowText(r.trait, r.stat)}</text>
      ))}
      <text> </text>
      {confirming
        ? <text>Reset all trait stats? This cannot be undone. [y]es / [n]o (default)</text>
        : <text>[r] reset stats     [esc] back</text>}
    </box>
  );
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `bun test tests/screens/StatsScreen.test.ts`
Expected: 3/3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/StatsScreen.tsx tests/screens/StatsScreen.test.ts
git commit -m "feat(screens): StatsScreen with sortable trait rows + reset confirm"
```

---

## Task 16: `CombatScreen` learns `mode` and renders coaching for tutorial

**Files:**
- Modify: `src/screens/CombatScreen.tsx`

Spec ref: §7.2.

- [ ] **Step 1: Replace `src/screens/CombatScreen.tsx`**

```tsx
import React, { useState, useEffect } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { BodyView } from "@/components/BodyView";
import { ControlsHint } from "@/components/ControlsHint";
import { FeedbackLine } from "@/components/FeedbackLine";
import { HintOverlay } from "@/components/HintOverlay";
import { HpBar } from "@/components/HpBar";
import { LayerRoadmap } from "@/components/LayerRoadmap";
import { MonsterPortrait } from "@/components/MonsterPortrait";
import { RegexInput } from "@/components/RegexInput";
import { useCombatEngine, type TraitEvent } from "@/components/hooks/useCombatEngine";
import type { Chapter, Monster, BestRegex, SaveMode } from "@/game/types";

export type CombatScreenProps = {
  chapter: Chapter;
  monster: Monster;
  mode: SaveMode;
  onKill: (bestRegexes: Record<string, BestRegex>) => void;
  onFlee: () => void;
  onTraitEvent?: (e: TraitEvent) => void;
};

export function CombatScreen(props: CombatScreenProps): React.ReactElement {
  const { chapter, monster, mode, onKill, onFlee, onTraitEvent } = props;
  const engine = useCombatEngine({ monster, onTraitEvent });
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (engine.state.phase.kind === "kill") {
      onKill(engine.state.bestRegexes);
    }
  }, [engine.state.phase, engine.state.bestRegexes, onKill]);

  useKeyboard((e: KeyEvent) => {
    if (engine.state.phase.kind === "intro" && e.name === "return") {
      engine.dismissIntro();
      return;
    }
    if (e.name === "?") {
      setHintOpen((v) => !v);
      e.preventDefault();
      return;
    }
    if (e.name === "escape") {
      if (hintOpen) setHintOpen(false);
      else onFlee();
    }
  }, { global: true });

  const totalLayers = monster.layers.length;
  const heartProgress = engine.state.phase.kind === "heart" || engine.state.phase.kind === "kill" ? 1 : 0;
  const hpPercent = ((engine.state.layersStripped.length + heartProgress) / (totalLayers + 1)) * 100;

  const inHeart = engine.state.phase.kind === "heart" || engine.state.phase.kind === "kill";
  const activeIdx =
    engine.state.phase.kind === "layerActive" ? engine.state.phase.layerIdx :
    engine.state.phase.kind === "strip"        ? engine.state.phase.layerIdx :
    Math.max(0, totalLayers - 1);

  const isTutorial = mode === "tutorial";
  const layerCoaching =
    isTutorial && engine.state.phase.kind === "layerActive"
      ? monster.layers[engine.state.phase.layerIdx]?.coaching
      : undefined;

  if (engine.state.phase.kind === "intro") {
    return (
      <box flexDirection="column" padding={2} gap={1} alignItems="center">
        <MonsterPortrait name={monster.portrait} />
        <text>{monster.name}</text>
        <text>{monster.flavor}</text>
        {isTutorial && monster.coaching ? <text>{monster.coaching}</text> : null}
        <text>[⏎] begin</text>
      </box>
    );
  }

  return (
    <box flexDirection="row" flexGrow={1}>
      <box flexDirection="column" padding={1} width={28} gap={1}>
        <text>{chapter.title}</text>
        <MonsterPortrait name={monster.portrait} />
        <text>{monster.name}</text>
        <HpBar percent={hpPercent} max={100} />
        <LayerRoadmap
          topics={monster.layers.map((l) => l.topic)}
          activeIdx={activeIdx}
          strippedIdxs={engine.state.layersStripped}
          inHeart={inHeart}
        />
        <ControlsHint />
      </box>
      <box flexDirection="column" flexGrow={1} padding={1} gap={1}>
        {layerCoaching ? <text>→ {layerCoaching}</text> : null}
        <BodyView
          monster={monster}
          activeLayerIdx={activeIdx}
          strippedIdxs={engine.state.layersStripped}
          inHeart={inHeart}
          matchedKeys={engine.evalResult?.matchedLineKeys ?? new Set<string>()}
        />
        {hintOpen ? (
          <HintOverlay title={chapter.title} lines={chapter.cheatsheet} />
        ) : (
          <>
            <RegexInput
              value={engine.pattern}
              onChange={(p) => engine.setPattern(p)}
              invalid={engine.evalResult?.invalid}
            />
            <FeedbackLine
              vitalsHit={engine.evalResult?.vitalsHit ?? 0}
              vitalsTotal={engine.evalResult?.vitalsTotal ?? 0}
              collateral={engine.evalResult?.collateral ?? 0}
              damage={engine.damage}
            />
          </>
        )}
      </box>
    </box>
  );
}
```

- [ ] **Step 2: Typecheck (full)**

Run: `bun run typecheck`
Expected: errors only in `src/app.tsx` (Task 17 fixes).

- [ ] **Step 3: Commit**

```bash
git add src/screens/CombatScreen.tsx
git commit -m "feat(screens): CombatScreen takes mode + onTraitEvent; renders coaching for tutorial"
```

---

# Phase 6 — Router + menu

## Task 17: `MenuScreen` gains all v2 entries + Continue logic

**Files:**
- Modify: `src/screens/MenuScreen.tsx`
- Modify: `tests/screens/MenuScreen.test.ts`

Spec ref: §4.1.

- [ ] **Step 1: Replace test**

```ts
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
```

- [ ] **Step 2: Replace screen**

```tsx
import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import type { SaveFile } from "@/game/types";

export type MenuChoice = "continue" | "story" | "encounter" | "tutorial" | "stats" | "quit";

export type MenuItem = { key: MenuChoice; label: string };

export function buildMenuItems(save: SaveFile): MenuItem[] {
  const items: MenuItem[] = [];
  if (save.lastMode !== null) items.push({ key: "continue", label: "Continue" });
  items.push({ key: "story", label: "Story" });
  items.push({ key: "encounter", label: "Encounter" });
  items.push({ key: "tutorial", label: "Tutorial" });
  items.push({ key: "stats", label: "Stats" });
  items.push({ key: "quit", label: "Quit" });
  return items;
}

export function navigateMenu(itemCount: number, currentIdx: number, direction: "up" | "down"): number {
  if (itemCount <= 0) return 0;
  return direction === "down"
    ? (currentIdx + 1) % itemCount
    : (currentIdx + itemCount - 1) % itemCount;
}

export type MenuScreenProps = {
  save: SaveFile;
  onSelect: (choice: MenuChoice) => void;
};

export function MenuScreen({ save, onSelect }: MenuScreenProps): React.ReactElement {
  const items = buildMenuItems(save);
  const [idx, setIdx] = useState(0);

  useKeyboard((e: KeyEvent) => {
    if (e.name === "up") setIdx((i) => navigateMenu(items.length, i, "up"));
    else if (e.name === "down") setIdx((i) => navigateMenu(items.length, i, "down"));
    else if (e.name === "return") {
      const item = items[idx];
      if (item) onSelect(item.key);
    }
  }, { global: true });

  return (
    <box flexDirection="column" padding={2} gap={1}>
      <text>regxslayer</text>
      <text>───────────</text>
      {items.map((it, i) => (
        <text key={it.key}>{i === idx ? "▶ " : "  "}{it.label}</text>
      ))}
    </box>
  );
}
```

- [ ] **Step 3: Run tests + typecheck**

Run: `bun test tests/screens/MenuScreen.test.ts && bun run typecheck`
Expected: tests pass; typecheck still red on `src/app.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/screens/MenuScreen.tsx tests/screens/MenuScreen.test.ts
git commit -m "feat(screens): MenuScreen — Continue + 4 modes + Stats; save-aware items"
```

---

## Task 18: `App` router rewrite for all v2 routes

**Files:**
- Modify: `src/app.tsx`

Spec ref: §4.2, §5.4.

This task is large but mechanical: it wires every screen we just built. Read it carefully.

- [ ] **Step 1: Replace `src/app.tsx`**

```tsx
import React, { useState } from "react";
import {
  storyChapters,
  tutorialMonsters,
  wildMonsters,
  allMonsters,
} from "@/content";
import { StorySelectScreen } from "@/screens/StorySelectScreen";
import { CombatScreen } from "@/screens/CombatScreen";
import { MenuScreen, type MenuChoice } from "@/screens/MenuScreen";
import { VictoryScreen } from "@/screens/VictoryScreen";
import { EncounterIntroScreen } from "@/screens/EncounterIntroScreen";
import { EncounterVictoryScreen } from "@/screens/EncounterVictoryScreen";
import { TutorialSelectScreen } from "@/screens/TutorialSelectScreen";
import { StatsScreen } from "@/screens/StatsScreen";
import {
  loadSave,
  recordKill,
  recordTraitAttempt,
  resetStats,
  setLastMode,
  incrementEncounterSessions,
} from "@/game/progress";
import { pickNext } from "@/game/encounter";
import type { Chapter, Monster, SaveFile, SaveMode } from "@/game/types";
import type { TraitEvent } from "@/components/hooks/useCombatEngine";

type Route =
  | { kind: "menu" }
  | { kind: "story-select" }
  | { kind: "encounter-intro" }
  | { kind: "encounter-fight"; monsterId: string; killsThisSession: number }
  | { kind: "encounter-victory"; monsterId: string; killsThisSession: number }
  | { kind: "tutorial-select" }
  | { kind: "stats" }
  | { kind: "combat"; chapterId: string; monsterId: string; mode: "story" | "tutorial" }
  | { kind: "victory"; chapterId: string; monsterId: string; mode: "story" | "tutorial" };

const ENCOUNTER_POOL: Monster[] = allMonsters.filter((m) => m.pool === "story" || m.pool === "wild");
const WILD_CHAPTER_ID = "__wild__";
const TUTORIAL_CHAPTER_ID = "__tutorial__";

const ENCOUNTER_CHAPTER: Chapter = {
  id: "__encounter__",
  title: "Wild Encounter",
  intro: "",
  cheatsheet: [
    "abc / ^abc / abc$       literals + anchors",
    "a|b / (a|b)             alternation + groups",
    "\\d \\w \\s              char classes",
    "[abc] [^abc] [a-z]      sets and ranges",
    "x* x+ x? x{n} x{n,m}    quantifiers",
    "\\. \\( \\$              escaping",
  ],
  monsters: [],
};

const TUTORIAL_CHAPTER: Chapter = {
  id: TUTORIAL_CHAPTER_ID,
  title: "Tutorial",
  intro: "",
  cheatsheet: [
    "abc       literal text",
    "^abc abc$ anchored",
    "\\d \\w \\s char classes",
    "x* x+ x?  quantifiers",
  ],
  monsters: [],
};

function findStoryMonster(chapterId: string, monsterId: string): { chapter: Chapter; monster: Monster } | null {
  const chapter = storyChapters.find((c) => c.id === chapterId);
  if (!chapter) return null;
  const monster = chapter.monsters.find((m) => m.id === monsterId);
  if (!monster) return null;
  return { chapter, monster };
}

function findTutorialMonster(monsterId: string): Monster | null {
  return tutorialMonsters.find((m) => m.id === monsterId) ?? null;
}

function findEncounterMonster(monsterId: string): Monster | null {
  return ENCOUNTER_POOL.find((m) => m.id === monsterId) ?? null;
}

function chapterIdForKill(monster: Monster, fallback: string): string {
  // Story monsters in encounter mode keep their authored chapter id (so kills aggregate).
  // Wild monsters in encounter mode use the synthetic wild chapter id.
  if (monster.pool === "story") {
    for (const c of storyChapters) {
      if (c.monsters.some((m) => m.id === monster.id)) return c.id;
    }
  }
  return fallback;
}

export function App(): React.ReactElement {
  const [save, setSave] = useState<SaveFile>(() => loadSave());
  const [route, setRoute] = useState<Route>({ kind: "menu" });
  const [progressUnwritable, setProgressUnwritable] = useState(false);

  const updatePersisted = (persisted: boolean): void => {
    if (!persisted) setProgressUnwritable(true);
  };

  const handleMenuSelect = (c: MenuChoice): void => {
    if (c === "quit") { process.exit(0); }
    if (c === "stats") { setRoute({ kind: "stats" }); return; }
    if (c === "story" || c === "continue" && save.lastMode === "story") {
      const r = setLastMode(save, "story");
      setSave(r.save); updatePersisted(r.persisted);
      setRoute({ kind: "story-select" }); return;
    }
    if (c === "encounter" || c === "continue" && save.lastMode === "encounter") {
      setRoute({ kind: "encounter-intro" }); return;
    }
    if (c === "tutorial" || c === "continue" && save.lastMode === "tutorial") {
      const r = setLastMode(save, "tutorial");
      setSave(r.save); updatePersisted(r.persisted);
      setRoute({ kind: "tutorial-select" }); return;
    }
  };

  const buildTraitEventHandler = (mode: SaveMode | null): ((e: TraitEvent) => void) | undefined => {
    if (mode !== "story" && mode !== "encounter") return undefined; // tutorial excluded
    return (e: TraitEvent): void => {
      if (e.kind === "perfect-strip" || e.kind === "non-perfect-try") {
        const r = recordTraitAttempt(save, { kind: e.kind, traits: e.traits });
        setSave(r.save); updatePersisted(r.persisted);
      }
    };
  };

  // ----- screen branches -----

  if (route.kind === "menu") {
    return (
      <box flexDirection="column" flexGrow={1}>
        <box flexGrow={1}><MenuScreen save={save} onSelect={handleMenuSelect} /></box>
        {progressUnwritable ? <text>⚠ progress not saved</text> : null}
      </box>
    );
  }

  if (route.kind === "stats") {
    return (
      <box flexDirection="column" flexGrow={1}>
        <box flexGrow={1}>
          <StatsScreen
            save={save}
            onReset={() => {
              const r = resetStats(save);
              setSave(r.save); updatePersisted(r.persisted);
            }}
            onBack={() => setRoute({ kind: "menu" })}
          />
        </box>
        {progressUnwritable ? <text>⚠ progress not saved</text> : null}
      </box>
    );
  }

  if (route.kind === "story-select") {
    return (
      <box flexDirection="column" flexGrow={1}>
        <box flexGrow={1}>
          <StorySelectScreen
            chapters={storyChapters}
            save={save}
            onPickMonster={(chapterId, monsterId) =>
              setRoute({ kind: "combat", chapterId, monsterId, mode: "story" })
            }
            onBack={() => setRoute({ kind: "menu" })}
          />
        </box>
        {progressUnwritable ? <text>⚠ progress not saved</text> : null}
      </box>
    );
  }

  if (route.kind === "tutorial-select") {
    return (
      <box flexDirection="column" flexGrow={1}>
        <box flexGrow={1}>
          <TutorialSelectScreen
            monsters={tutorialMonsters}
            onPick={(monsterId) =>
              setRoute({ kind: "combat", chapterId: TUTORIAL_CHAPTER_ID, monsterId, mode: "tutorial" })
            }
            onBack={() => setRoute({ kind: "menu" })}
          />
        </box>
        {progressUnwritable ? <text>⚠ progress not saved</text> : null}
      </box>
    );
  }

  if (route.kind === "encounter-intro") {
    return (
      <box flexDirection="column" flexGrow={1}>
        <box flexGrow={1}>
          <EncounterIntroScreen
            onBegin={() => {
              const r1 = setLastMode(save, "encounter");
              const r2 = incrementEncounterSessions(r1.save);
              setSave(r2.save);
              updatePersisted(r1.persisted && r2.persisted);
              const m = pickNext(ENCOUNTER_POOL, null);
              setRoute({ kind: "encounter-fight", monsterId: m.id, killsThisSession: 0 });
            }}
            onBack={() => setRoute({ kind: "menu" })}
          />
        </box>
        {progressUnwritable ? <text>⚠ progress not saved</text> : null}
      </box>
    );
  }

  if (route.kind === "encounter-fight") {
    const monster = findEncounterMonster(route.monsterId);
    if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
    const onTrait = buildTraitEventHandler("encounter");
    return (
      <box flexDirection="column" flexGrow={1}>
        <box flexGrow={1}>
          <CombatScreen
            chapter={ENCOUNTER_CHAPTER}
            monster={monster}
            mode="encounter"
            onKill={(bestRegexes) => {
              const chapterId = chapterIdForKill(monster, WILD_CHAPTER_ID);
              const r = recordKill(save, {
                chapterId,
                monsterId: monster.id,
                bestRegexes,
                mode: "encounter",
              });
              setSave(r.save); updatePersisted(r.persisted);
              setRoute({
                kind: "encounter-victory",
                monsterId: monster.id,
                killsThisSession: route.killsThisSession + 1,
              });
            }}
            onFlee={() => setRoute({ kind: "menu" })}
            onTraitEvent={onTrait}
          />
        </box>
        {progressUnwritable ? <text>⚠ progress not saved</text> : null}
      </box>
    );
  }

  if (route.kind === "encounter-victory") {
    const monster = findEncounterMonster(route.monsterId);
    if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
    return (
      <box flexDirection="column" flexGrow={1}>
        <box flexGrow={1}>
          <EncounterVictoryScreen
            monsterName={monster.name}
            sessionNumber={save.encounterSessions}
            killNumberInSession={route.killsThisSession}
            onAdvance={() => {
              const next = pickNext(ENCOUNTER_POOL, route.monsterId);
              setRoute({
                kind: "encounter-fight",
                monsterId: next.id,
                killsThisSession: route.killsThisSession,
              });
            }}
            onBack={() => setRoute({ kind: "menu" })}
          />
        </box>
        {progressUnwritable ? <text>⚠ progress not saved</text> : null}
      </box>
    );
  }

  if (route.kind === "combat") {
    if (route.mode === "tutorial") {
      const monster = findTutorialMonster(route.monsterId);
      if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
      return (
        <box flexDirection="column" flexGrow={1}>
          <box flexGrow={1}>
            <CombatScreen
              chapter={TUTORIAL_CHAPTER}
              monster={monster}
              mode="tutorial"
              onKill={() => {
                // Tutorial kills are intentionally not persisted.
                setRoute({ kind: "tutorial-select" });
              }}
              onFlee={() => setRoute({ kind: "tutorial-select" })}
            />
          </box>
          {progressUnwritable ? <text>⚠ progress not saved</text> : null}
        </box>
      );
    }
    // story mode
    const found = findStoryMonster(route.chapterId, route.monsterId);
    if (!found) { setRoute({ kind: "menu" }); return <box />; }
    const { chapter, monster } = found;
    const onTrait = buildTraitEventHandler("story");
    return (
      <box flexDirection="column" flexGrow={1}>
        <box flexGrow={1}>
          <CombatScreen
            chapter={chapter}
            monster={monster}
            mode="story"
            onKill={(bestRegexes) => {
              const r = recordKill(save, {
                chapterId: chapter.id,
                monsterId: monster.id,
                bestRegexes,
                mode: "story",
              });
              setSave(r.save); updatePersisted(r.persisted);
              setRoute({ kind: "victory", chapterId: chapter.id, monsterId: monster.id, mode: "story" });
            }}
            onFlee={() => setRoute({ kind: "story-select" })}
            onTraitEvent={onTrait}
          />
        </box>
        {progressUnwritable ? <text>⚠ progress not saved</text> : null}
      </box>
    );
  }

  // route.kind === "victory"
  const monster =
    route.mode === "tutorial"
      ? findTutorialMonster(route.monsterId)
      : (findStoryMonster(route.chapterId, route.monsterId)?.monster ?? null);
  if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexGrow={1}>
        <VictoryScreen
          monsterName={monster.name}
          onContinue={() =>
            setRoute(
              route.mode === "tutorial"
                ? { kind: "tutorial-select" }
                : { kind: "story-select" }
            )
          }
        />
      </box>
      {progressUnwritable ? <text>⚠ progress not saved</text> : null}
    </box>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 3: Run full suite**

Run: `bun test`
Expected: all green (existing + new). The full count should be the v1 baseline (77) plus all v2 additions: traits (4), progress (extended; ~10), encounter (4), stats (helpers ~6 + screen 3), validator (~10), content data-driven (~16) — well over 100 passing tests.

- [ ] **Step 4: Validator + smoke build**

Run: `bun run validate-content && bun run build`
Expected: validator clean (16 monsters, 0 warnings), build emits `dist/regxslayer`.

- [ ] **Step 5: Commit**

```bash
git add src/app.tsx
git commit -m "feat(app): v2 router — Continue/Story/Encounter/Tutorial/Stats with trait + save wiring"
```

---

## Task 19: `cli.tsx` — no changes needed; sanity check

**Files:**
- Read-only check: `src/cli.tsx`

The cli entry from v1 still works as-is. The v2 changes are all internal. This task is a verification step only.

- [ ] **Step 1: Confirm cli.tsx still compiles**

Run: `bun run typecheck && bun run build`
Expected: clean, `dist/regxslayer` built.

- [ ] **Step 2: No commit needed.** (Skip if there is no diff.)

---

# Phase 7 — Documentation + final verification

## Task 20: README updates

**Files:**
- Modify: `README.md`

Spec ref: §10.

- [ ] **Step 1: Replace `README.md`**

```markdown
# regxslayer

A terminal regex-practice game. Each monster is a layered text body — write a
regex that surgically matches the right strings to peel layers, then strike the
heart for the kill.

## Modes

- **Story** — 3 chapters of 4 monsters each. Unlocks chapter-by-chapter as you
  slay your first monster in each chapter.
- **Encounter** — endless random monsters drawn from the story + wild pools.
  Slay one, the next appears immediately. Press `esc` to flee back to the menu.
- **Tutorial** — a small set of teaching monsters (Lump, Pip, Bop) with inline
  coaching text. Replayable. Tutorial activity does not feed practice stats.
- **Stats** — practice breakdown across 15 regex traits. Highlights traits
  you've never touched and traits where your perfect-strip rate is low. The
  reset key (`r`) zeros the practice numbers without wiping story progress.

## Install

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

To build a standalone binary (no Bun required at runtime):

```bash
bun run build
./dist/regxslayer
```

## Controls

- Type to write your regex. Highlights and damage update on every keystroke.
- A layer auto-strips when your regex matches **only** its vital lines.
- `?` — toggle hint cheatsheet for the current chapter
- `esc` — flee combat (back to mode-specific select) or close hints
- `↑`/`↓`/`⏎` — navigate menus
- `Ctrl-C` — quit

## Saves

Progress is saved to `~/.regxslayer/save.json` (or
`$XDG_DATA_HOME/regxslayer/save.json` on Linux when set). v1 saves migrate
forward automatically. Slay one monster in a chapter to unlock the next chapter.

## No telemetry

regxslayer is fully offline. It opens no network sockets.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README updated for v2 modes (Story/Encounter/Tutorial/Stats)"
```

---

## Task 21: Final verification + tag

- [ ] **Step 1: Full clean run**

```bash
bun install
bun run typecheck
bun test
bun run validate-content
bun run build
```

Expected:
- Install: no changes.
- Typecheck: clean.
- Tests: all pass. Aim ≥ 130 tests (v1 baseline 77 + v2 additions ~50).
- Validator: `✓ 16 monster(s) validated, 0 warning(s).`
- Build: `dist/regxslayer` produced.

- [ ] **Step 2: Manual smoke (per spec §9.2)**

Run: `./dist/regxslayer`

Walk through:
1. Fresh state (delete `~/.regxslayer/save.json` if present): main menu shows 5 entries (no Continue).
2. Tutorial → Lump → see coaching text on intro and on each layer → kill → return to tutorial-select. Stats screen still all "no practice yet".
3. Story → Literals & Anchors → Scribblet → kill it (`^(hello|world)$` then `^INK_HEART_42$`). Stats now show LITERAL/ANCHOR_START/ANCHOR_END with non-zero counts. `storyKills: 1`.
4. Encounter → enter intro → `⏎` → fight → kill any monster → see "Encounter #1 · kill 1 of this session" → press a key to advance → see another encounter → `esc` returns to main menu.
5. Stats → reset confirm flow works (`r`, then `y`).
6. Quit binary, restart: Continue appears in menu and routes to encounter (the last mode used).
7. Save downgrade test: place a v1-shaped save file at `~/.regxslayer/save.json` with one slainAt entry; launch v2; verify it reads as v2 with `storyKills: 1` and `traitStats: {}`.

- [ ] **Step 3: Tag**

```bash
git tag v0.2.0
```

(Don't push. User decides when to publish.)

---

# Self-review record

This plan was self-reviewed for spec coverage (every section of v2 spec maps to a task), placeholders (none), and type consistency (`TraitEvent`, `SaveMode`, `MonsterPool`, `recordKill` signature, route shape are consistent across tasks).

Implementation-time conventions held over from v1:
- Pure helpers tested via `bun:test`; render-level checks deferred to manual smoke (Task 21).
- `@gridland/testing` stays uninstalled.
- Strip animation, slow-pattern guard, gridland JSX intrinsics are unchanged.
