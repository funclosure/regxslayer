# Home Screen — Trophy Wall Design

Iteration on `MenuScreen` to surface chapter progress and run history on
the landing screen, while keeping the existing pixel-title and monster
art that anchor the game's identity.

- **Status:** design approved 2026-05-06, pending implementation plan.
- **Scope:** `src/screens/MenuScreen.tsx` and its tests only. No save
  schema changes, no new routes, no theming pass.

## 1. Concept

The current Home screen is decorative: pixel title + monster art +
tagline + menu. It tells a returning player nothing about where they
left off, what they've cleared, or how far they've come. The Trophy
Wall iteration adds two pieces of just-in-time context — a chapter
progress block and a one-line lifetime stat — without losing the art
that gives the screen its character.

Three explicit goals:

1. **Returning players see progress at a glance.** Chapter completion
   is the single most useful thing to show on Home; it answers "what
   should I play next."
2. **The mode hint on Continue is honest.** The save records `lastMode`
   but no per-mode position, so the hint says only the mode.
3. **First-run feels welcoming, not empty.** With no save data the
   layout still reads as intentional, not as a broken returning view.

## 2. Layout

All content fits within the existing 76-char width budget (enforced by
`tests/screens/MenuScreen.test.ts`). Block title and tagline are
unchanged.

```
 ____  _____ ____ __  __ ____  _      _ __   _______ ____
|  _ \| ____/ ___|\ \/ / ___|| |    / \\ \ / / ____|  _ \
| |_) |  _|| |  _  \  /\___ \| |   / _ \\ V /|  _| | |_) |
|  _ <| |__| |_| | /  \ ___) | |__/ ___ \| | | |___|  _ <
|_| \_\_____\____|/_/\_\____/|____/_/   \_\_| |_____|_| \_\

      .----.             ┌─ chapters ──────────┐
  ___/ .  . \___         │ 1 Literals ████ 4/4 │
 /   \  --  /   \        │ 2 Classes  ██░░ 2/4 │
 \____\____/____/        │ 3 Quants   ░░░░ 0/4 │
      /_||_\             └─────────────────────┘

                    precision is damage

                    ▶ Continue   (last: encounter)
                      Story
                      Encounter
                      Tutorial
                      Stats
                      Quit

              37 slain · 4 sessions · [↑↓] [enter]
```

### What changes vs. current

- The inline `[^filler] / \w+ / ^heart$` annotations next to the monster
  are removed; the right-side real estate becomes the chapter box.
- Tagline `precision is damage` moves out of the monolithic `LANDING_ART`
  constant and is rendered as its own row below the monster band, so the
  monster band is exactly 5 rows tall and aligns row-for-row with the
  5-row chapter box.
- The monster band and the chapter box are composed by concatenating
  the i-th monster row with the i-th chapter-box row (left-padded to
  align under the title). Both are exactly 5 rows by construction.
- New continue-line annotation: ` (last: <mode>)` in the same row.
- New bottom line: lifetime kills, encounter sessions, hotkey hint.

### What stays

- Pixel-letter `REGXSLAYER` title block.
- Monster art (face + legs).
- Menu order: Continue (when present), Story, Encounter, Tutorial,
  Stats, Quit. Selection indicator `▶`.

## 3. Data sources

All data is derived from the `SaveFile` already passed to `MenuScreen`
plus the chapter content modules already imported elsewhere in the app.
No new persistence and no new game-state plumbing.

| Field | Source | Notes |
|-------|--------|-------|
| Chapter slain count | `save.chapters[id]?.monsters` size | 0 when absent |
| Chapter total | content module `chapter.monsters.length` | static |
| Continue mode | `save.lastMode` | `null` → row hidden |
| Lifetime slain | `save.storyKills + save.encounterKills` | |
| Encounter sessions | `save.encounterSessions` | |

Chapter list and short labels are derived once at module scope:

```ts
const CHAPTERS = [
  { id: "literals-anchors", short: "Literals", total: 4 },
  { id: "char-classes",     short: "Classes",  total: 4 },
  { id: "quantifiers",      short: "Quants",   total: 4 },
];
```

The `total` is duplicated rather than computed from the chapter modules
to keep `MenuScreen` free of content imports — the chapters are
content-frozen for v2 and a content-shape change is a separate event.
A small unit test guards this against drift (asserts `total` equals
each chapter's `monsters.length`).

## 4. Behaviors

### Continue line

- Hidden entirely when `save.lastMode === null`.
- When present, renders as `▶ Continue   (last: <mode>)` where `<mode>`
  is the literal lowercase value (`story`, `encounter`, `tutorial`).
- The `(last: …)` suffix is part of the menu row text; it scrolls with
  selection like the rest of the row but is not part of the highlight
  (no styling change vs. label — terminal output is monochrome here).

### Chapter progress box

- Always rendered, even on a fresh save.
- Bar is fixed 4 cells: `█` per slain monster, `░` per remaining
  (truncated to 4 if a chapter ever exceeds 4 monsters; spec assumes
  4-per-chapter).
- Row format: `<n> <short> <bar> <slain>/<total>` padded to a uniform
  inner width of 21 chars; box outer width 23 chars.
- Box renders even when all chapters are 0/4 — empty bars are intended
  visual texture for new players, not an error state.

### Bottom line

- When `storyKills + encounterKills > 0` OR `encounterSessions > 0`:
  `<total> slain · <sessions> sessions · [↑↓] [enter]`
- Otherwise (truly fresh): `[↑↓] move · [enter] choose · [q] quit`
- Single line, centered.

### Empty / first-run state

A brand-new player sees:

- No Continue row.
- Chapter box with three `░░░░ 0/4` rows.
- Tagline as usual.
- Menu starting at Story.
- Welcome variant of the bottom line.

The screen is the same shape as the returning view — only the fill
levels and a few lines differ. No conditional layout branches.

## 5. Module structure

Single file (`src/screens/MenuScreen.tsx`), no new files. Pure helpers
exported for unit tests:

- `buildChapterRows(save, chapters): string[]` — returns the boxed
  block as an array of padded rows (border + 3 chapter lines + border).
- `buildContinueLabel(lastMode): string | null` — `null` when hidden;
  the rendered row text otherwise.
- `buildBottomLine(save): string` — picks welcome vs. stats variant.
- `buildMenuItems(save)` and `buildMenuRows(items, idx)` — unchanged.
- `buildLandingRows(save, items, idx): string[]` — signature changes
  (gains `save`); this is the single composition point used by
  `MenuScreen` and by the existing landing-rows tests.

`MenuScreen` itself stays a thin React component that calls
`buildLandingRows` and renders one `<text>` per row. No new state, no
new effects.

### What is intentionally not abstracted

- No new `ChapterProgress.tsx` component. Three padded rows of text
  inside an existing box don't earn their own file.
- No `formatBar(filled, total, width)` utility. The single inline
  expression `"█".repeat(s) + "░".repeat(t - s)` is clearer than a
  helper.
- No theming or color hooks. The screen is monochrome `<text>` today;
  adding color is a separate iteration if/when we have a styling layer.

## 6. Tests

Existing tests in `tests/screens/MenuScreen.test.ts` continue to assert
the title row, the tagline, and the centered menu width. The new
behaviors get focused unit tests against the pure helpers:

- `buildContinueLabel`: returns `null` for `lastMode === null`; returns
  the right suffix for each of `story`/`encounter`/`tutorial`.
- `buildChapterRows`: renders correct bar fills for an empty save, a
  partial save, and a fully-cleared save; renders all three chapters
  in fixed order regardless of save shape.
- `buildBottomLine`: picks welcome variant for empty save; picks stats
  variant when any of kills/sessions is > 0.
- `buildLandingRows`: full-screen snapshot-style assertions — empty
  save renders welcome row + 0/4 bars; populated save renders the
  Continue row, partial bars, and stats line. Width assertion (≤ 76)
  retained.
- A drift guard: asserts `CHAPTERS[i].total === chapterModule.monsters.length`
  for each of the three story chapters, so a future chapter-size change
  fails loudly here instead of silently mis-rendering bars.

## 7. Out of scope

- Per-mode resume positions (would require save schema changes).
- Color, dim/bright styling for the `(last: …)` suffix or the bottom
  line — TUI is monochrome today.
- Encounter pool stats on Home (already covered by Stats screen).
- Tutorial completion progress on Home.
- Animated/transitional landing.
- Chapter unlock gating on Home (chapters are not gated in v2).
