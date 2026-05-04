# regxslayer v2 — Encounter Mode + Traits + Stats Design

A second game mode (encounter) plus a trait-tagged content model and a
practice-stats screen, layered on top of the v1 game shipped on
2026-05-04.

- **Status:** design approved 2026-05-04, pending implementation plan.
- **Authoring scope:** v2 only. Adaptive encounter selection, habitats,
  best-of-N sessions, and per-session diffs are explicitly deferred.

## 1. Concept

v1 ships a curated story (3 chapters × 4 monsters) with hand-paced
unlocks. v2 adds two complementary directions:

- **Encounter mode** — a Pokemon-style endless-run mode where random
  monsters are drawn from a shared pool. Quick, no chapter overhead, no
  unlocks; you flee back to the main menu when you've had enough.
- **Practice stats** — every story and encounter kill is tagged against
  a controlled vocabulary of regex *traits* so the player can see at a
  glance which features they've practiced and which areas are weak.
- **Tutorial mode** — a small set of teaching monsters with inline
  coaching text. Lives outside both story and encounter, so an
  experienced player can skip it.

Story mode (v1) stays as-is and remains the primary "guided"
experience. Encounter and Tutorial coexist with it as siblings on the
main menu.

## 2. Trait vocabulary

The single source of truth for trait-tagging lives in
`src/game/traits.ts`:

```ts
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
```

| Trait | Means | Example feature |
|---|---|---|
| `LITERAL` | Plain text matching | `abc` |
| `ALTERNATION` | OR | `a\|b` |
| `GROUP` | Capturing or non-capturing groups | `(...)` |
| `ANCHOR_START` | Beginning-of-line | `^` |
| `ANCHOR_END` | End-of-line | `$` |
| `CHAR_CLASS_DIGIT` | Digit shorthand | `\d`, `\D` |
| `CHAR_CLASS_WORD` | Word shorthand | `\w`, `\W` |
| `CHAR_CLASS_SPACE` | Whitespace shorthand | `\s`, `\S` |
| `CHAR_CLASS_SET` | Bracketed sets | `[abc]`, `[^abc]` |
| `CHAR_CLASS_RANGE` | Ranges | `[a-z]`, `[0-9]` |
| `QUANT_STAR` | Zero or more | `x*` |
| `QUANT_PLUS` | One or more | `x+` |
| `QUANT_OPTIONAL` | Zero or one | `x?` |
| `QUANT_EXACT` | Exact / ranged counts | `x{n}`, `x{n,m}` |
| `ESCAPE` | Escaping reserved chars | `\.`, `\(`, `\$` |

Naming convention: `UPPER_SNAKE_CASE`, category prefix, specific feature
suffix. The list is intentionally finite; lookarounds, backreferences,
and named groups stay deferred (same as v1).

## 3. Data model changes

All changes are additive to v1 types in `src/game/types.ts`. Existing
matcher / damage / combat-state-machine code is untouched.

### 3.1 `Layer` gains `traits` and `coaching`

```ts
export type Layer = {
  topic: string;
  traits: Trait[];        // NEW — non-empty, subset of the parent monster's traits
  lines: Line[];
  coaching?: string;      // NEW — only used in tutorial mode
};
```

### 3.2 `Monster` gains `traits`, `pool`, `coaching`

```ts
export type MonsterPool = "story" | "wild" | "tutorial";

export type Monster = {
  id: string;
  name: string;
  portrait: string;
  flavor: string;
  pool: MonsterPool;            // NEW — drives mode selection
  traits: Trait[];              // NEW — non-empty, union of layer traits + heart-relevant
  layers: Layer[];
  heart: { text: string };
  coaching?: string;            // NEW — only used during tutorial intro
};
```

### 3.3 `SaveFile` v2 shape

```ts
export type TraitStat = {
  /** # of layers cleanly stripped while exercising this trait */
  perfectStrips: number;
  /** # of distinct non-perfect patterns submitted on layers tagged with this trait,
   *  deduped per (trait, layer-life). */
  nonPerfectTries: number;
};

export type SaveFile = {
  version: 2;                                   // BUMPED from 1
  createdAt: string;
  updatedAt: string;
  chapters: Record<string, { monsters: Record<string, MonsterRecord> }>;
  // NEW v2 fields
  traitStats: Record<string, TraitStat>;        // keyed by Trait literal
  encounterSessions: number;                    // lifetime count of "enter encounter mode" events
  encounterKills: number;                       // lifetime kills in encounter mode
  storyKills: number;                           // lifetime kills in story mode
  lastMode: "story" | "encounter" | "tutorial" | null;  // for menu Continue
};
```

### 3.4 v1 → v2 migration (`loadSave`)

When `loadSave` reads a `version: 1` file:

1. Set `version: 2`.
2. Set `traitStats: {}` (we don't have layer-trait info on v1 kills).
3. Set `encounterSessions: 0`, `encounterKills: 0`, `lastMode: null`.
4. Compute `storyKills` from existing `chapters` (count entries with `slainAt`)
   so a returning v1 player's lifetime story-kill count survives.
5. Persist immediately (atomic write).

The migration must be **idempotent**: a re-run on a v2 save is a no-op.

### 3.5 Trait stat recording

`useCombatEngine` is extended with an optional callback:

```ts
type TraitEvent =
  | { kind: "perfect-strip"; layerIdx: number; traits: Trait[] }
  | { kind: "non-perfect-try"; layerIdx: number; traits: Trait[] };

export function useCombatEngine(opts: {
  monster: Monster;
  stripDelayMs?: number;
  onTraitEvent?: (e: TraitEvent) => void;   // NEW
}): CombatEngine;
```

The hook fires `perfect-strip` when a layer transitions to `strip`. It
fires `non-perfect-try` whenever the user types a *new distinct
non-perfect pattern* on a still-active layer. Within one layer-life, a
given `Trait` is counted at most once for non-perfect tries (a Set lives
inside the hook, reset whenever the active layer changes).

The Story and Encounter routes pass an `onTraitEvent` that calls
`recordTraitAttempt(save, event)` (a new pure function in
`src/game/progress.ts`). The Tutorial route does **not** pass the
callback — tutorial activity does not feed stats.

## 4. Mode router & menu

### 4.1 Main menu

```
▶ Continue
  Story
  Encounter
  Tutorial
  Stats
  Quit
```

`Continue` is hidden if `save.lastMode === null` (fresh save). Otherwise
it opens whatever mode-select screen matches the last mode.

### 4.2 Route type

```ts
type Route =
  | { kind: "menu" }
  | { kind: "story-select" }
  | { kind: "encounter-intro" }
  | { kind: "encounter-fight"; monsterId: string }
  | { kind: "encounter-victory"; monsterId: string }
  | { kind: "tutorial-select" }
  | { kind: "stats" }
  | { kind: "combat"; chapterId: string; monsterId: string; mode: "story" | "tutorial" }
  | { kind: "victory"; chapterId: string; monsterId: string; mode: "story" | "tutorial" };
```

Encounter has its own combat/victory route kinds because the post-kill
flow differs (auto-advance to next encounter vs. return to select).

**Synthetic chapter ids.** Tutorial and Wild-pool monsters do not belong
to any authored `Chapter`. To keep `combat`/`victory`/`recordKill`
working without conditional branches, the implementation uses two
reserved chapter ids:

- `"__tutorial__"` — passed as `chapterId` when routing through `combat`
  with `mode: "tutorial"`. Tutorial kills are NOT persisted via
  `recordKill` (tutorial completion is intentionally not tracked), so no
  `chapters["__tutorial__"]` entry is ever written. The id only flows
  through routing.
- `"__wild__"` — used by encounter mode when a kill targets a
  `pool === "wild"` monster (kills of `pool === "story"` monsters in
  encounter mode use the monster's authored story chapter id, so
  cross-mode best-regex tracking aggregates correctly). Encounter kills
  of wild monsters do write to `save.chapters["__wild__"]`.

### 4.3 Screen inventory

| Screen | Purpose | Status |
|---|---|---|
| `MenuScreen` | Top-level menu | Updated (new entries) |
| `StorySelectScreen` | Pick a story chapter / monster | Renamed from `ChapterSelectScreen`, filters to `pool === "story"` |
| `EncounterIntroScreen` | Splash before first encounter; explains controls | New |
| `EncounterVictoryScreen` | Brief auto-advancing post-kill frame | New |
| `TutorialSelectScreen` | Pick a tutorial monster | New |
| `StatsScreen` | Practice stats | New |
| `CombatScreen` | Fight | Updated to take `mode` and render coaching when tutorial |
| `VictoryScreen` | Story / tutorial post-kill frame | Unchanged |

## 5. Encounter mode flow

### 5.1 Entry

- Player picks `Encounter` from menu → router enters `encounter-intro`.
- `EncounterIntroScreen` shows a one-paragraph explainer plus
  `[⏎] begin · [esc] back`.
- On `⏎`, the router increments `save.encounterSessions`, sets
  `lastMode = "encounter"`, persists, and transitions to
  `encounter-fight` with a `monsterId` chosen by `pickNext`.

### 5.2 `pickNext` (`src/game/encounter.ts`)

```ts
export function pickNext(
  pool: Monster[],
  previousId: string | null,
  rng: () => number = Math.random,
): Monster;
```

- Uniform random over `pool`.
- If `pool.length >= 2`, never returns the monster whose id equals
  `previousId` — re-roll until a different one is selected.
- If `pool.length === 1`, returns the only monster (no-back-to-back is
  best-effort).
- The function is pure given a deterministic `rng`, so unit tests can
  feed a seeded source.

### 5.3 Combat reuse

`encounter-fight` renders the existing `CombatScreen` with the picked
monster and a synthetic `Chapter` wrapper:

```ts
const ENCOUNTER_CHAPTER: Chapter = {
  id: "__encounter__",
  title: "Wild Encounter",
  intro: "",
  cheatsheet: GENERAL_CHEATSHEET,   // see §5.5
  monsters: [],                     // unused; selection is external
};
```

Combat header shows `Wild Encounter · #N` where `N` is
`save.encounterSessions`.

### 5.4 Kill handling

When the engine reports `kind: "kill"`:

- `recordKill` writes `slainAt` and `bestRegexes` against the same
  `chapters` map as Story (so a Story-then-Encounter kill of the same
  monster doesn't double-track).
- `save.encounterKills` increments.
- Router transitions to `encounter-victory` showing the slain name and
  `Encounter #N · kill K of this session`. The frame auto-advances after
  1500 ms to the next `encounter-fight` (with a fresh `pickNext` pass).
- Any keypress before the timer fires:
  - `esc` → return to `menu`.
  - any other key → advance immediately.

### 5.5 General cheatsheet

Encounter mode lacks per-chapter context, so its `?` overlay shows a
curated 8-line cheatsheet drawn from the union of all topic areas. This
content lives next to `ENCOUNTER_CHAPTER` in
`src/screens/EncounterIntroScreen.tsx` (or a dedicated module).

### 5.6 Flee mid-fight

`esc` from `encounter-fight`'s combat screen → return to `menu` (not
back to `encounter-intro`). Any partial trait-stats for the active layer
are not committed (only completed `perfect-strip` events have already
fired).

## 6. Stats screen

### 6.1 Layout (fits 80×24)

```
┌─ STATS ─────────────────────────────────────────────────────────┐
│                                                                 │
│  Lifetime: 23 monsters slain (story 14 · encounter 9)           │
│  Sessions: 4 encounter runs                                     │
│                                                                 │
│  Trait practice (sorted: needs-practice → strong)               │
│  ─────────────────────────────────────────────────────────────  │
│  ⚠ ESCAPE              0/0      no practice yet                 │
│  ⚠ QUANT_EXACT         1/3       33%   needs practice           │
│  ⚠ QUANT_OPTIONAL      2/5       40%   needs practice           │
│    QUANT_PLUS          5/7       71%   shaky                    │
│    GROUP               4/5       80%   strong                   │
│    LITERAL             18/19     95%   strong                   │
│    ANCHOR_START        12/13     92%   strong                   │
│    ... (all 15 traits, even at 0/0)                             │
│                                                                 │
│  [r] reset stats     [esc] back                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Per-row format

```
{flag} {trait_padded_to_18} {perfectStrips}/{perfectStrips + nonPerfectTries}    {pct}%   {label}
```

### 6.3 Classification (`classify(stat)`)

- `perfectStrips + nonPerfectTries === 0` → `flag: "⚠"`, `label: "no practice yet"`, no percentage shown.
- `perfectRate < 0.50` → `flag: "⚠"`, `label: "needs practice"`.
- `perfectRate < 0.80` → `flag: " "`, `label: "shaky"`.
- `perfectRate ≥ 0.80` → `flag: " "`, `label: "strong"`.
- **Statistical floor:** if the total is ≥ 1 but < 3, the row is forced
  to `"needs practice"` regardless of rate (small samples are not
  trustworthy enough to call "strong").

### 6.4 Sort (`sortTraits(stats, allTraits)`)

1. `"no practice yet"` first.
2. `"needs practice"` ascending by rate (worst first).
3. `"shaky"` ascending by rate.
4. `"strong"` ascending by rate (least-strong first).

### 6.5 Reset action

- `r` opens an inline confirm: `Reset all trait stats? [y]es / [n]o (default)`.
- `y` clears `traitStats`, `encounterSessions`, `encounterKills`,
  `storyKills`, persists, returns to stats. **Does not** clear
  `chapters` (story progress / best regexes survive).
- Any other key cancels.

### 6.6 Pure helpers (testable without rendering)

- `classify(stat: TraitStat): { flag: string; label: string; rate: number | null }`
- `sortTraits(stats: Record<string, TraitStat>, allTraits: readonly Trait[]): Array<{ trait: Trait; row: ReturnType<typeof classify> }>`
- `formatStatsRow(trait, classified): string`

## 7. Tutorial mode

### 7.1 What makes a tutorial monster "tutorial"

Two things, and only two:

1. `pool: "tutorial"` — drives selection. `TutorialSelectScreen` lists
   only these. Story and Encounter pools never include them.
2. `coaching` field on `Monster` and/or `Layer` — rendered by
   `CombatScreen` when `mode === "tutorial"`.

### 7.2 Coaching rendering rule

When `mode === "tutorial"`:

- `intro` phase: if `monster.coaching` is set, render it as a paragraph
  below the flavor text, above `[⏎] begin`.
- `layerActive(idx)` phase: if `monster.layers[idx].coaching` is set,
  render it in a thin banner at the top of the arena, prefixed `→ `,
  above `BodyView`.

In other modes, these fields are ignored even if present (defensive —
non-tutorial monsters should not set `coaching`, and the validator warns
if they do).

### 7.3 Tutorial monster set

Three monsters in `src/content/tutorial.ts`:

1. **Lump (the Literal Lump)** — `traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END"]`. Two layers (literals; anchored). Heart: `TUT_LUMP_HEART`.
2. **Pip** — `traits: ["CHAR_CLASS_DIGIT", "CHAR_CLASS_WORD", "CHAR_CLASS_SPACE"]`. Three small one-trait-each layers. Heart: `TUT_PIP_HEART`.
3. **Bop** — `traits: ["QUANT_STAR", "QUANT_PLUS", "QUANT_OPTIONAL"]`. Three layers, one per `*`/`+`/`?`. Heart: `TUT_BOP_HEART`.

Each has 2–3 layers, each layer has 2–4 lines. Quick by design.

### 7.4 Tutorial select screen

- Lists the three monsters as a flat menu.
- No unlock gating, no slain marks (replayable; tutorial completion is
  not tracked in `chapters` to avoid polluting Story progress).
- `⏎` enters combat with `mode: "tutorial"`.
- `esc` returns to main menu.

### 7.5 Validator changes for tutorial monsters

- `pool === "tutorial"` skips the `trivial-killer` check (small
  layers are intentional).
- A tutorial monster with no `coaching` field on the monster itself
  emits a *warning* (not an error). Per-layer coaching is encouraged but
  not required.

## 8. Content additions for v2

### 8.1 Trait-tag the existing 12 story monsters

Mechanical authoring pass. The authoritative trait map (used by the
implementer):

| Monster | Layer 0 traits | Layer 1 traits | Monster traits (union) |
|---|---|---|---|
| **scribblet** | `LITERAL`, `ANCHOR_START`, `ANCHOR_END` | — | `LITERAL`, `ANCHOR_START`, `ANCHOR_END` |
| **caretling** | `ANCHOR_START`, `LITERAL` | `ANCHOR_END`, `LITERAL` | `LITERAL`, `ANCHOR_START`, `ANCHOR_END` |
| **pinmeister** | `ANCHOR_START`, `ANCHOR_END`, `LITERAL` | `ANCHOR_START`, `ANCHOR_END`, `LITERAL` | `LITERAL`, `ANCHOR_START`, `ANCHOR_END`, `ALTERNATION` |
| **alternaut** | `ALTERNATION` | `ALTERNATION`, `GROUP` | `LITERAL`, `ALTERNATION`, `GROUP` |
| **digiton** | `CHAR_CLASS_DIGIT`, `QUANT_PLUS` | `CHAR_CLASS_DIGIT`, `QUANT_EXACT` | `CHAR_CLASS_DIGIT`, `QUANT_PLUS`, `QUANT_EXACT` |
| **worderly** | `CHAR_CLASS_WORD`, `QUANT_PLUS` | `CHAR_CLASS_WORD`, `QUANT_PLUS` | `CHAR_CLASS_WORD`, `QUANT_PLUS` |
| **spaceblob** | `CHAR_CLASS_SPACE`, `ANCHOR_START` | `CHAR_CLASS_SPACE`, `QUANT_PLUS` | `CHAR_CLASS_SPACE`, `ANCHOR_START`, `QUANT_PLUS` |
| **rangewolf** | `CHAR_CLASS_RANGE`, `QUANT_PLUS` | `CHAR_CLASS_SET`, `QUANT_PLUS` | `CHAR_CLASS_RANGE`, `CHAR_CLASS_SET`, `QUANT_PLUS` |
| **starfist** | `QUANT_STAR`, `LITERAL` | — | `QUANT_STAR`, `LITERAL` |
| **pluson** | `QUANT_PLUS`, `CHAR_CLASS_DIGIT` | `QUANT_PLUS`, `LITERAL` | `QUANT_PLUS`, `CHAR_CLASS_DIGIT`, `LITERAL` |
| **questling** | `QUANT_OPTIONAL`, `LITERAL` | `QUANT_OPTIONAL`, `GROUP`, `LITERAL` | `QUANT_OPTIONAL`, `LITERAL`, `GROUP` |
| **bracetron** | `QUANT_EXACT`, `CHAR_CLASS_WORD` | `QUANT_EXACT`, `LITERAL` | `QUANT_EXACT`, `CHAR_CLASS_WORD`, `LITERAL` |

Plus `pool: "story"` on every existing monster.

`ESCAPE` is intentionally absent from story monsters — no current layer
requires escaping a metacharacter. It enters the game via the optional
wild monster (§8.3).

### 8.2 Three tutorial monsters

Authored in `src/content/tutorial.ts`. See §7.3 for the trait shape.
Each gets a portrait entry in `src/content/portraits.ts`.

### 8.3 Wild-only monster (recommended)

One monster in `src/content/wild.ts` with `pool: "wild"` that exercises
`ESCAPE` (e.g., requires `\.` to match periods literally) plus revisits
one or two existing traits. Without it, encounter mode is just shuffled
story monsters; with it, day-one encounters have variety and `ESCAPE`
gets non-zero practice.

If skipping for v2, leave `wildMonsters: []`. Encounters still work.

### 8.4 Content index reshuffle

`src/content/chapters.ts` is renamed/expanded to `src/content/index.ts`:

```ts
export const storyChapters: Chapter[] = [chapter1, chapter2, chapter3];
export const tutorialMonsters: Monster[] = [...];
export const wildMonsters: Monster[] = [...];   // [] is acceptable for v2
export const allMonsters: Monster[] = [
  ...storyChapters.flatMap(c => c.monsters),
  ...tutorialMonsters,
  ...wildMonsters,
];
```

### 8.5 Validator additions

- Each `Layer.traits` is non-empty and a subset of its
  `Monster.traits`.
- Each `Monster.traits` is non-empty.
- Each `Monster.pool` is set.
- Tutorial monsters skip the trivial-killer check.
- Tutorial monster with no `coaching` emits a warning (non-fatal).

## 9. Testing

### 9.1 Unit tests (`bun:test`, no `@gridland/testing`)

| Area | Tests |
|---|---|
| `src/game/traits.ts` | `TRAITS` is a frozen tuple of length 15; `Trait` is the corresponding union |
| `src/game/encounter.ts` | `pickNext` returns from pool, never returns `previousId` when `pool.length ≥ 2`, returns the only one when `pool.length === 1`, deterministic with seeded `rng` |
| `src/game/progress.ts` | `recordTraitAttempt` increments correctly per event kind; `loadSave` migrates v1 → v2 with derived `storyKills`; migration is idempotent on v2 saves |
| `src/screens/StatsScreen.tsx` | `classify` for zero, low, mid, high, < 3 floor; `sortTraits` order |
| `scripts/validate-content.ts` | Layer-traits-subset, monster-has-traits, monster-has-pool, tutorial-skips-trivial-killer; warning for missing coaching |
| `src/content/*` | Data-driven: every monster in every pool passes the validator |

### 9.2 Manual smoke

1. Fresh launch — main menu has 6 entries; `Continue` is hidden.
2. Tutorial → play Lump → coaching text on intro and on each layer →
   kill → return to tutorial-select; Stats remain empty.
3. Story → kill scribblet → trait stats now show non-zero perfect
   strips.
4. Encounter → enter intro → `⏎` → fight → kill → auto-advance to
   next → flee with `esc`.
5. Stats → see lifetime breakdown; `r` reset confirm flow works.
6. Quit, restart binary → save persisted; `Continue` appears and
   resumes the last mode.
7. With a v1 save in place, launch v2 binary → migration runs silently;
   Story progress preserved; stats start empty.

## 10. v2 deliverable scope

### In

- 15-trait vocabulary (`src/game/traits.ts`).
- Layer/Monster `traits`, `pool`, `coaching` fields.
- `SaveFile` v1 → v2 migration with derived `storyKills`.
- New screens: `StatsScreen`, `EncounterIntroScreen`,
  `EncounterVictoryScreen`, `TutorialSelectScreen`. `ChapterSelectScreen`
  renamed to `StorySelectScreen`.
- `useCombatEngine` extended with `onTraitEvent`; trait-stat logging
  from Story + Encounter.
- `pickNext` encounter selector.
- Three tutorial monsters (Lump, Pip, Bop).
- Trait tags retro-fit on all 12 existing story monsters.
- One wild-only monster training `ESCAPE` (recommended; can ship as `[]`).
- Validator additions.
- README updated.

### Out (deferred)

- Adaptive encounter selection.
- Encounter habitats.
- Best-of-N session length.
- Per-session stats diff.
- Lookarounds, backreferences, named groups.
- Best-regex display in stats screen (we record via existing
  `bestRegexes`, but no v2 UI to browse).
- Encounter mode affecting story unlocks.

## 11. Risks

1. **Trait-dedup state in `useCombatEngine`.** The per-layer-life Set
   must reset on layer change. Keying it on `state.phase` should
   suffice; verify in tests.
2. **Save migration idempotency.** Read-time migration must persist
   immediately and be safe to re-run. Cover with a test that calls
   `loadSave` twice on the same v1 file and asserts identical v2
   output.
3. **`StorySelectScreen` rename.** Commit the `git mv` separately from
   any code changes inside the file so history stays clean.
