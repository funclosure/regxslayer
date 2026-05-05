# regxslayer — Design (v1)

A terminal regex practice game where you slay monsters by writing regex patterns
that surgically match the right strings. Built on [gridland](https://gridland.io)
(React + OpenTUI) on the [Bun](https://bun.sh) runtime.

- **Status:** design approved 2026-05-04, pending implementation plan.
- **Authoring scope:** v1 only. Future modes (soft pressure, browser bundle,
  advanced topics) are explicitly deferred.

## 1. Concept

The player fights one monster at a time. A monster's body is a stack of text
**layers**; each layer is a small set of strings tagged as **vital** (must match)
or **filler** (must not match). The player types a regex into a live filter; on
every keystroke, matched lines highlight and a damage preview updates. When the
regex matches **exactly** the active layer's vitals (all of them, no filler, no
locked-layer matches), the layer auto-strips. The bottom-most layer is the
**heart** — a single vital string. A regex matching only the heart kills the
monster.

Each chapter focuses on one regex topic. v1 ships **3 chapters** (Literals &
Anchors, Character Classes, Quantifiers), each with **4 monsters** (12 total).
The first monster of chapter 1 is the in-game tutorial — there is no separate
tutorial chapter.

There is no time pressure, no fail state, no skip in v1. The game is a sequence
of regex puzzles dressed in combat narrative; the "slayer" framing comes from
animations and ASCII portraits, not threat. Soft pressure modes (rage timer,
body mutation) are deferred.

## 2. Stack & build

- **Bun** for runtime, install, test runner, and bundler.
- **gridland** (`@gridland/bun`, `@gridland/utils`) for the TUI; React for
  components; OpenTUI as the underlying renderer.
- Distribution: single binary via `bun build --compile src/cli.tsx --outfile dist/regxslayer`.
- v1 targets terminal only. No browser bundle.
- v1 supports macOS and Linux. Windows is best-effort (Bun supports it; we will
  not test for v1).

## 3. Project layout

```
regxslayer/
├── src/
│   ├── cli.tsx                  # entry — gridland app bootstrap
│   ├── app.tsx                  # top-level router (menu / chapter / combat / victory)
│   ├── screens/
│   │   ├── menu.tsx
│   │   ├── chapter-select.tsx
│   │   ├── combat.tsx           # split layout combat screen
│   │   └── victory.tsx
│   ├── components/              # presentational, see §6
│   │   └── hooks/               # useCombatEngine, etc.
│   ├── game/                    # pure logic, no React
│   │   ├── types.ts
│   │   ├── matcher.ts           # safe regex compile + match
│   │   ├── damage.ts            # scoring formula
│   │   ├── combat.ts            # combat state machine
│   │   └── progress.ts          # save/load
│   └── content/
│       ├── chapters.ts          # ordered chapter index
│       ├── chapter-1-literals.ts
│       ├── chapter-2-charclasses.ts
│       ├── chapter-3-quantifiers.ts
│       └── portraits.ts
├── tests/
├── scripts/
│   └── validate-content.ts      # build-time content guard
├── package.json
├── tsconfig.json
└── bunfig.toml
```

Rationale: `game/` is pure TS, easily unit-tested without rendering. `content/`
is typed TS data, refactor-safe. Components are split by role and stay small.

## 4. Game loop & state machine

### 4.1 Top-level routes

```
MENU ──► CHAPTER_SELECT ──► COMBAT ──► VICTORY ──► CHAPTER_SELECT
  ▲                            │
  └────────────────────────────┘  (esc/quit at any time → MENU)
```

### 4.2 Combat sub-states (one fight)

```
INTRO        : monster portrait + name appears (skippable, ⏎)
LAYER_ACTIVE : current layer rendered, vitals marked,
               regex input live; on perfect-match → STRIP
STRIP        : strip animation (~400ms); if more layers → LAYER_ACTIVE,
               else → HEART
HEART        : last layer revealed = the vital string.
               Live filter again; perfect heart match → KILL
KILL         : death animation, damage tally, "press ⏎ to continue"
EXIT         : write progress, return to CHAPTER_SELECT
```

### 4.3 Per-keystroke flow inside `LAYER_ACTIVE` / `HEART`

1. No debounce — react instantly on keystroke.
2. Compile pattern in a try/catch (invalid regex shows red inline error, no crash).
3. Run match against the body lines; produce an `EvalResult` (§5.2).
4. Update highlights and the numeric/symbolic feedback line.
5. If `perfect` → trigger `STRIP`.

### 4.4 Quit / pause

- `esc` from combat → confirm prompt → return to MENU. Progress for unfinished
  monsters is **not** persisted (you have to slay to save the kill).
- `tab` opens an inline hint panel (overlay) showing the current chapter's
  cheatsheet. Press `tab` or `esc` to close. (Originally specced as `?`, but
  `?` collides with `QUANT_OPTIONAL` — players need to type `?` into their
  regex. `tab` never appears in a regex pattern.)

## 5. Combat mechanics

### 5.1 Layer model

- A `Layer` has a `topic` label and an array of `Line`s, each tagged `vital` or
  `filler` (see §7 schema).
- All lines from all layers are visible in the body view at all times. Render
  states:
  - **Stripped** (already cleared): faded + struck-through; gutter shows a dim
    space; matches inside are ignored.
  - **Active** (top-most not-yet-stripped): full brightness; vitals show `♦` in
    the gutter; matches drive stripping.
  - **Locked** (below active): visible at normal brightness with a dim chain
    glyph (`⛓`) in the gutter; matches do **not** count toward stripping but
    **do** count as collateral. This enforces "peel in order."
- Only the active layer counts toward stripping.

### 5.2 Match evaluation

```ts
type EvalResult = {
  vitalsHit: number;          // active layer vitals matched
  vitalsTotal: number;
  collateral: number;         // matches in active filler + any locked-layer line
  perfect: boolean;           // vitalsHit === vitalsTotal && collateral === 0
  invalid?: string;           // regex syntax error message
};
```

### 5.3 Damage formula (cosmetic — drives the preview readout, not gating)

```
damage = round( 100 * (vitalsHit / vitalsTotal) * precisionPenalty )
precisionPenalty = max(0.2, 1 - 0.25 * collateral)
```

- Perfect (all vitals, no collateral) → 100.
- 1/2 vitals, no collateral → 50.
- 2/2 vitals, 1 collateral → 75.
- All vitals, 4+ collateral → 20 (floor at 20% to avoid demoralizing zeros).
- Heart phase: same formula with `vitalsTotal=1`. Collateral counts any
  not-yet-stripped body line other than the heart.

### 5.4 Symbolic feedback (the qualitative line under the number)

| damage | label |
|---|---|
| 0 | ⚪ no match |
| 1–49 | 🔸 partial |
| 50–99 | 🔶 close |
| 100 | 🔥 perfect |

`100` triggers `STRIP` (or `KILL` in heart phase).

### 5.5 Regex compile & safety

- Compile with `new RegExp(pattern, "gu")`. Unicode flag on by default.
- v1 disallows user-supplied flags. Pattern is treated as the regex source only.
- Invalid syntax → caught, displayed inline (`⚠ Unterminated character class`),
  body keeps the last valid pattern's highlights, no state change.
- Catastrophic backtracking guard: each keystroke evaluation must complete in
  ≤ 50ms wall clock (measured per keystroke, summed across line evals). On
  budget exceeded, abort the evaluation, treat as no match, and show
  `⚠ slow pattern — simplify` under the input.

### 5.6 Strip transition

- When `perfect` fires, freeze input for ~400ms, animate the active layer
  (fade rows; if it was the last layer before the heart, draw a small "♥
  cracks open" effect), then advance.
- Keystrokes during the freeze are buffered so the user does not lose input.

## 6. Components & rendering

### 6.1 Routing

`src/app.tsx` owns route state and the save store, and renders one of:

| Screen | Responsibility |
|---|---|
| `Menu` | Title + Continue / New Game / Quit. |
| `ChapterSelect` | List chapters with completion (e.g. `2/4 slain`); pick to enter. |
| `Combat` | Split layout. Holds combat state, owns the keystroke loop. |
| `Victory` | Monster fallen, damage tally, "press ⏎ to continue". |

### 6.2 Combat layout (split)

```
┌─ <chapterTitle> · <n>/<total> ─┬─ <monsterName> ─────────────┐
│  <MonsterPortrait/>            │                              │
│                                │  <BodyView/>                 │
│  <HpBar/>                      │                              │
│                                │                              │
│  <LayerRoadmap/>               │                              │
│                                │                              │
│  <ControlsHint/>               ├──────────────────────────────┤
│                                │  <RegexInput/>               │
│                                │  <FeedbackLine/>             │
└────────────────────────────────┴──────────────────────────────┘
```

### 6.3 Reusable components (`src/components/`)

- **`MonsterPortrait`** — renders ASCII portrait by key. Reacts on damage tick
  (small shake) and on KILL (tilt + fade). Tone: silly little ASCII guys for v1.
- **`HpBar`** — `████████░░ 78/100`. Cosmetic; driven by
  `(monster.layersStripped + heartProgress) / total * 100`.
- **`LayerRoadmap`** — vertical list:

  ```
  ● literals      ✓
  ● char class    ▲
  ○ quantifiers
  ○ heart
  ```

- **`BodyView`** — renders all layers, top to bottom. Each line gets a left
  **gutter marker**: `♦` for active vital, blank for active filler, `⛓` for
  locked, `·` for stripped (with `DIM`+`STRIKETHROUGH` on the line text).
  Matched substrings within a line are colored (green for vital matches, red
  for collateral) and underlined for color-blind safety.
- **`RegexInput`** — single-line text input, cursor visible. Renders the
  pattern with light syntax highlighting (group parens, char-class brackets,
  quantifiers in distinct colors). Inline `⚠ <syntax error>` to the right
  when invalid.
- **`FeedbackLine`** — two stacked lines:
  - top: `1/2 vitals · collateral 0 · dmg 42`
  - bottom: `🔸 partial`
- **`ControlsHint`** — `[tab] hint   [esc] flee`.
- **`HintOverlay`** — full-arena overlay (over the body) showing the chapter
  cheatsheet; `tab` or `esc` to dismiss.

### 6.4 Hooks (`src/components/hooks/`)

- `useKeyboard` (from `@gridland/utils`) — global key handling at the screen level.
- `useTerminalDimensions` (from `@gridland/utils`) — react to resize. Enforces
  minimum 100×30; below that, render the resize prompt (§9).
- `useCombatEngine(monster)` — wraps the `combat.ts` state machine. Returns
  `{state, eval, onKey}`.

### 6.5 State ownership

- `Combat` screen owns: current monster, layer index, last `EvalResult`,
  animation flags.
- `App` owns: save store, current route.
- `game/` modules are stateless pure functions called by hooks.

## 7. Content schema

### 7.1 Types (`src/game/types.ts`)

```ts
export type Line    = { text: string; vital: boolean };
export type Layer   = { topic: string; lines: Line[] };
export type Monster = {
  id: string;
  name: string;
  portrait: string;          // key into src/content/portraits.ts
  flavor: string;
  layers: Layer[];           // peeled in order
  heart: { text: string };   // single vital string
};
export type Chapter = {
  id: string;
  title: string;
  intro: string;
  cheatsheet: string[];      // shown on `?`
  monsters: Monster[];
};
```

### 7.2 Chapter file shape (`src/content/chapter-2-charclasses.ts`)

```ts
import type { Chapter } from "../game/types";

export const chapter: Chapter = {
  id: "char-classes",
  title: "Character Classes",
  intro: "Learn to talk to letters, digits, and whitespace.",
  cheatsheet: [
    "\\d  any digit       \\D  non-digit",
    "\\w  word char       \\W  non-word",
    "\\s  whitespace      \\S  non-ws",
    "[abc]  any of a,b,c  [^abc]  none of",
    "[a-z]  range",
  ],
  monsters: [
    {
      id: "grimtooth",
      name: "Grimtooth the Pattern-Eater",
      portrait: "grimtooth",
      flavor: "Eats anything matching `.*`. Fights back with precision.",
      layers: [
        {
          topic: "literals warmup",
          lines: [
            { text: "user_42",   vital: true  },
            { text: "log_99",    vital: true  },
            { text: "cache_7",   vital: true  },
            { text: "https://example.com/path", vital: false },
          ],
        },
        {
          topic: "character classes",
          lines: [
            { text: "admin_01",  vital: true  },
            { text: "guest_15",  vital: true  },
            { text: "api_3",     vital: true  },
            { text: "2024-01-01 v1.2.3 port:8080", vital: false },
          ],
        },
      ],
      heart: { text: "KILL_TOKEN_x9k2" },
    },
    // ...3 more monsters
  ],
};
```

### 7.3 Portraits

`src/content/portraits.ts` exports `Record<string, string[]>` of multi-line
ASCII art (silly tone). Lookup by `Monster.portrait` key.

### 7.4 Chapter index

`src/content/chapters.ts` exports an ordered array of chapter modules. The
order **is** the campaign order.

### 7.5 Build-time validation (`scripts/validate-content.ts`)

Walks every chapter and asserts:

- Each monster has ≥1 layer; each layer has ≤8 lines.
- Each layer has ≥1 vital.
- `heart.text` is non-empty and non-trivial (length ≥ 3, not a single repeated character).
- "Trivial-killer" check: a small fixed list of naive regex (`.+`, `.*`, `\w+`)
  must over-match at least one filler/locked-layer line for every layer. If a
  trivial regex would clean-strip a layer, the layer is too easy and the test
  fails.

The validator runs in `bun test` (data-driven test) **and** before
`bun build --compile` via a small script.

## 8. Persistence

### 8.1 File

`~/.regxslayer/save.json`. On Linux, honor `$XDG_DATA_HOME` (defaulting to
`~/.local/share`), so the path becomes `$XDG_DATA_HOME/regxslayer/save.json`
when set.

### 8.2 Schema

```ts
type BestRegex = {
  pattern: string;
  length: number;          // shorter == better tiebreaker
};

type MonsterRecord = {
  slainAt: string;         // ISO; presence == slain
  // keys are layer indices stringified ("0", "1", ...) plus the literal "heart"
  bestRegexes: Record<string, BestRegex>;
};

type SaveFile = {
  version: 1;
  createdAt: string;       // ISO date
  updatedAt: string;
  chapters: Record<string, { monsters: Record<string, MonsterRecord> }>;
};
```

### 8.3 Behavior

- **Read on startup.** Missing file → fresh save (no error).
- **Write on KILL.** Atomic: write `save.json.tmp`, `fsync`, then rename.
  Single-process app, no locking needed.
- **Unlock rule:** chapter N+1 unlocks when ≥1 monster in chapter N is slain.
- **"Best regex"** is the shortest pattern length that produced a perfect
  strip/kill for a given layer.
- **Schema version** field present from day one for forward migrations.

### 8.4 v1 explicitly does NOT persist

- Per-monster attempt counts, time spent, or regex history.
- Cloud sync, profiles, or multiple saves.
- Achievements.

### 8.5 Corruption

If JSON parse fails on load, rename the bad file to
`save.json.corrupt-<timestamp>` and start fresh. Show a one-line warning at the
menu. Never silently overwrite a corrupt save.

## 9. Error handling, edge cases, accessibility

- **Invalid regex** — try/catch around compile. Inline error next to input;
  highlights from last valid pattern stay; no state change.
- **Catastrophic backtracking** — 50ms per-keystroke deadline; abort, treat as
  no match, show `⚠ slow pattern — simplify`.
- **Empty regex** — treated as no match (not "match all").
- **User-supplied flags** — disallowed in v1. Internal pattern is always `gu`.
- **Terminal too small** — minimum 100×30. Below, render
  `Please resize to at least 100×30 (currently <w>×<h>)`. `useTerminalDimensions`
  reacts to live resize.
- **`NO_COLOR` env / no-color terminals** — color is never the only signal.
  Fall back: `♦` vital marker, `⛓` locked layers, `·` stripped layers (also
  rendered with `STRIKETHROUGH` attribute), `▶` cursor, `UNDERLINE` attribute
  on matched substrings.
- **Save file unwritable** — show non-blocking footer warning
  `⚠ progress not saved`. Game continues.
- **Process signals** — handle `SIGINT` and `SIGTERM` to restore the terminal
  (verify gridland behavior in tests).
- **No network, no telemetry.** Documented in README.
- **Accessibility v1**: keyboard-only; color is decorative, not load-bearing;
  no mouse expected.

## 10. Testing

| Layer | Tool | What's covered |
|---|---|---|
| Pure game logic (`src/game/*.ts`) | `bun test` | matcher, damage formula, combat state machine, save/load, content validator |
| React components (`src/components/*`) | `bun test` + `@gridland/testing` | render output (snapshot), key handling for `RegexInput`, conditional rendering for `HintOverlay` |
| Content (`src/content/*.ts`) | `bun test` (data-driven) | every monster passes the validator |
| Integration | `bun test` | scripted "type a regex, expect strip" against a fake monster end-to-end through `useCombatEngine` |
| Smoke | manual | `bun run src/cli.tsx` — play through chapter 1, kill at least one monster, restart, confirm save loaded |

Coverage target: pure `game/` modules ≥ 90%. Components ≥ 60%. No CI gate for
v1; just a target.

**CI:** single GitHub Actions workflow on push: `bun install`, `bun test`,
`bun build --compile src/cli.tsx --outfile dist/regxslayer` (smoke build, no
release artifact in v1).

## 11. v1 scope

### In scope

- 3 chapters × 4 monsters: **Literals & Anchors → Character Classes → Quantifiers** (12 monsters total).
- First monster of chapter 1 is the in-game tutorial.
- Single binary via `bun build --compile`.
- macOS + Linux supported. Windows best-effort (untested).
- README with: install, controls, screenshot or asciinema GIF, "no telemetry" note.
- Local save at `~/.regxslayer/save.json`.

### Out of scope (deferred to later versions)

- Browser bundle (gridland supports it; add later).
- Soft pressure / time mode.
- Lookarounds, backreferences, named groups (chapters 4+).
- Stats / review screens.
- User-supplied regex flags.
- Online features.

## 12. Open items for the implementation plan

These are explicitly **not** designed here; they will be authored / decided
during implementation:

- The actual content of all 12 monsters (line strings, vital/filler tagging,
  hearts).
- The 12 ASCII portraits.
- Final color palette and typography tuning, after the first playable build is
  on screen.
