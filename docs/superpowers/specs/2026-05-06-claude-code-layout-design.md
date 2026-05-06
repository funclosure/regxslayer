# Claude Code-style Layout — Design

A third-pass rethink of the cross-screen layout. Flips the persistent
chrome from the top to the bottom and adopts a Claude Code-style frame:
content fills the viewport from the top inside a scrollbox, with a
two-line status block pinned to the bottom of the terminal.

- **Status:** design draft 2026-05-06, pending user approval.
- **Replaces:** `docs/superpowers/specs/2026-05-06-screen-chrome-rethink-design.md`
  (the top `ChromeBar`). The previous spec's chrome row is removed entirely;
  every non-Menu screen now anchors at the bottom rather than at the top.

## 1. Concept

Iteration 2 (top chrome) successfully removed the "content jumping" feel
of iteration 1, but live use surfaced a new wish: better adaptation to
small terminals (the chrome ate vertical space at the top while content
spilled below the fold), and more familiarity for developers used to
Claude Code's TUI layout.

The principle remains:

> **Reduce eye travel. Maximize cohesion.** Every non-Menu screen
> should feel like the same frame, with the same anchor points.
> Screens may differ in *what* they show, but not in *where* they
> show it.

The way iteration 3 achieves it — borrowed from Claude Code's own TUI
shell — is to give every screen a scrollable content area on top and a
two-line status block pinned to the bottom:

1. **Main content area** — fills from the top of the terminal down,
   wrapped in a `scrollbox` so long content scrolls instead of pushing
   the status block off-screen on narrow terminals.
2. **Status block** at the very bottom (rows H−2, H−1) — always
   visible, brand + screen name + lifetime stats on row H−2,
   screen-specific hints on row H−1.

Short content sits at the top of the viewport with empty air below
(visually anchored to the same top-left corner across screens). Long
content scrolls. The status block doesn't move. The Menu remains
exempt — it's the title screen, has its own block-letter banner, and
keeps its existing layout.

### Why bottom-anchored status

- **Familiar.** Mirrors Claude Code's own status row; users moving
  between Claude Code and regxslayer don't re-learn the frame.
- **Better terminal-size adaptation.** Content grows from a fixed
  top-left corner downward. On a tall terminal the status sits far
  below; on a short terminal the scrollbox absorbs overflow without
  the status moving. The previous top-chrome layout had the inverse
  problem — content slid below the fold while empty air sat above.
- **Anchors are physical, not relative.** Top-left is row 0,
  bottom-status is rows H−2 and H−1. Both are absolute positions in
  the terminal grid, so navigations land in the same place every time.

## 2. Components

### 2.1 `<StatusBar screen={...} hints={...} />`

New component at `src/components/StatusBar.tsx`. Replaces `ChromeBar`.

```ts
type StatusBarProps = {
  /** Short screen identifier shown after the brand, e.g. "stats". */
  screen: string;
  /** Hints line, e.g. "[r] reset · [esc] back". */
  hints: string;
};
```

Renders two rows, full terminal width, monochrome:

```
─── regxslayer · stats · 12 slain · 3 sessions ──────────────────
[r] reset · [esc] back
```

Row 1 — info row, dashes baked in around the content (same aesthetic as
the iteration-2 ChromeBar but with stats merged in):

- 3 dashes + space — left padding
- `regxslayer · <screen> · <N> slain · <M> sessions` — info segment
- space + dashes filling the remaining width — right padding

Row 2 — hints, left-aligned, no dashes. Empty hints render as a blank
row (consistent vertical rhythm; the status block is always exactly two
rows tall).

`<N> slain` and `<M> sessions` come from a save context (§2.2). The
component reads `save.storyKills + save.encounterKills` for kills and
`save.encounterSessions` for sessions.

The component accepts no width prop; it stretches to `width="100%"` and
uses `useTerminalDimensions()` for the dash math.

#### Narrow-terminal fallback

When the terminal is too narrow to fit the full info row, the component
drops segments right-to-left:

1. Drop `<M> sessions` first (least important).
2. Drop `<N> slain` next.
3. Drop `<screen>` next.
4. Always keep `regxslayer` on the brand row.

This keeps the brand visible at any width down to ~16 columns, which is
already below the supported terminal-width budget (76 chars).

### 2.2 `<SaveProvider value={save}>` + `useSaveLifetime()`

New context at `src/components/SaveContext.tsx`. The status bar needs
read access to lifetime kill/session counts; threading `save` through
every `<Screen>` call would be ugly because three of the six target
screens don't otherwise need it (Tutorial, Victory, EncounterIntro).

Shape:

```ts
const SaveContext = React.createContext<SaveFile | null>(null);

export function SaveProvider({ save, children }: { save: SaveFile; children: React.ReactNode }) {
  return <SaveContext.Provider value={save}>{children}</SaveContext.Provider>;
}

export function useSaveLifetime(): { slain: number; sessions: number } {
  const save = React.useContext(SaveContext);
  if (!save) throw new Error("useSaveLifetime must be called inside <SaveProvider>");
  return {
    slain: save.storyKills + save.encounterKills,
    sessions: save.encounterSessions,
  };
}
```

The provider wraps the whole route switch in `src/app.tsx`. This costs
one wrapper line in `App` and keeps every screen call site clean.

Tests cover `useSaveLifetime`'s pure derivation by extracting a helper
`computeLifetime(save)` and asserting against fixture saves.

### 2.3 `<Screen hints={...} screen={...}>` (rewritten)

Updated component at `src/components/Screen.tsx`. The signature changes:

```ts
type ScreenProps = {
  children: React.ReactNode;
  /** Right-aligned hint text, e.g. "[esc] back · [?] help". */
  hints: string;
  /** Short screen identifier shown in the status bar, e.g. "stats". */
  screen: string;
  /**
   * Optional pinned content rendered above the StatusBar but outside
   * the scrollbox — for short alerts or confirm prompts that must
   * stay visible regardless of scroll position. Use sparingly; most
   * screens don't need this.
   */
  footer?: React.ReactNode;
  /** Inner column width in characters. Default `DEFAULT_SCREEN_WIDTH` (64). */
  width?: number;
};
```

The previous `ChromeBar` is removed. The component now wraps content in
a top-anchored scrollbox, pins an optional `footer` row above the
StatusBar, and pins the `StatusBar` at the bottom.

Render:

```tsx
<box flexDirection="column" flexGrow={1} width="100%">
  <scrollbox flexGrow={1}>
    <box flexDirection="column" alignItems="center" padding={2}>
      <box flexDirection="column" width={width}>
        {children}
      </box>
    </box>
  </scrollbox>
  {footer ? (
    <box flexDirection="column" alignItems="center">
      <box flexDirection="column" width={width}>
        {footer}
      </box>
    </box>
  ) : null}
  <StatusBar screen={screen} hints={hints} />
</box>
```

The `footer` exists specifically for content that *must not* be
hidden by scroll — currently only StatsScreen's reset-confirm prompt
needs it (see §3). Keeping `footer` as a Screen-level prop rather than
free-form children avoids each screen reinventing its own
"pin-above-status" pattern.

Notable changes from iteration 2:

- **Universal scrollbox.** The Screen wrapper owns scrolling for every
  screen, so individual screens never need a `<scrollbox>` of their own
  or a `<box flexGrow={1} />` slack absorber. Long content scrolls;
  short content sits at the top with empty space below.
- **Inner column drops `gap={1}`.** Most screens want adjacent rows
  tight (title + underline, content rows). Screens that want spacing
  insert a blank `<text> </text>` or a `gap={1}` wrapper themselves.
  This trades one global rule for explicit local intent and stops the
  awkward "title is one row away from its underline" gap.
- **No `flexGrow={1}` on the inner column.** The scrollbox sizes to its
  own slack (`flexGrow={1}`); the inner column sizes to its content and
  gets clipped/scrolled by the parent scrollbox. This mirrors
  `pace/src/ui/tabs/CardsTab.tsx`'s `<scrollbox flexGrow={1}>`
  structure.

The `centerVertically` prop is gone (was already removed in iteration
2; mentioned here for completeness — vertical placement remains a
non-decision).

## 3. Per-screen structure

Every non-Menu screen follows this shape:

```tsx
<Screen screen="stats" hints="[r] reset · [esc] back">
  <text>TITLE</text>
  <text>──────</text>           {/* underline matched to TITLE width */}

  {/* main content — multiple rows, top-anchored */}
</Screen>
```

Three positional invariants enforced by the structure:

- Title and underline render at row 2 (outer padding-top = 2) across
  all screens.
- Status block pins to rows H−2 and H−1.
- Content between title and status flows top-down naturally; if it
  exceeds the slack, the scrollbox handles it.

No per-screen slack absorbers. No per-screen scrollboxes.

### Variants

**List screens (Stats, StorySelect)** — these had local scrollboxes in
iteration 2; those are removed. The Screen-level scrollbox now scrolls
the full content (header + list together), matching how Claude Code
scrolls its main pane as a unit.

```tsx
<Screen
  screen="stats"
  hints="[r] reset · [esc] back"
  footer={
    confirming
      ? <text>Reset all trait stats? This cannot be undone. [y]es / [n]o (default)</text>
      : null
  }
>
  <text>STATS</text>
  <text>─────</text>
  <text>Lifetime: 12 monsters slain (story 7 · encounter 5)</text>
  <text>Sessions: 3 encounter runs</text>
  <text> </text>
  <text>Trait practice (sorted: needs-practice → strong)</text>
  <text>─────────────────────────────────────────────────</text>
  {traitRows.map((r) => (
    <text key={r.trait}>{renderStatsRowText(r.trait, r.stat)}</text>
  ))}
</Screen>
```

The reset-confirm prompt goes in `footer`, not in `children`. If it
sat in the scrollbox alongside the trait rows, a long trait list would
push it off-screen — pressing `[r]` would silently appear to do nothing
until the user scrolled down to find the prompt. The pinned footer
keeps it always visible above the StatusBar.

**Short list screens (TutorialSelect, EncounterIntro)** — same shape;
the previous `<box flexGrow={1} />` slack absorbers are removed.

**Cinematic screens (Victory, EncounterVictory)** — same shape; no
horizontal centering, no slack absorber. Content sits top-anchored in
the inner column, status block anchors the bottom. The "vertically
centered stage moment" of iteration 1 stays given up; the bottom status
is what carries cohesion now.

```tsx
<Screen screen="victory" hints="any key advances · [esc] menu">
  <text>SLAIN</text>
  <text>─────</text>
  <text>{monsterName}</text>
  <text>Encounter #{sessionNumber} · kill {killNumberInSession} of this session</text>
</Screen>
```

Both post-kill cinematic screens (`VictoryScreen` and
`EncounterVictoryScreen`) use the same `screen="victory"` label. Their
on-page titles still differ (`VICTORY` vs `SLAIN`) — the title carries
the per-event flavor while the status bar stays steady, reinforcing
cohesion across mode transitions.

### Hints + screen labels per screen

Each screen passes a `screen` identifier and `hints` string. The
identifier is short and lowercase; it appears in the status bar's brand
row.

| Screen | screen | hints |
|---|---|---|
| StatsScreen | `stats` | `[r] reset · [esc] back` |
| StorySelectScreen | `story` | `[↑↓] move · [⏎] enter · [esc] back` |
| TutorialSelectScreen | `tutorial` | `[↑↓] move · [⏎] start · [esc] back` |
| EncounterIntroScreen | `encounter` | `[⏎] begin · [esc] back` |
| EncounterVictoryScreen | `victory` | `any key advances · [esc] menu` |
| VictoryScreen | `victory` | `[⏎] continue` |

Screens never duplicate the hint inline; the status-bar version is the
always-on reminder.

## 4. Migration scope

| Screen | Wrap with new `<Screen>`? | Notes |
|---|---|---|
| `StatsScreen` | yes | drop local scrollbox; let Screen scroll the whole pane. |
| `StorySelectScreen` | yes | drop local scrollbox. |
| `TutorialSelectScreen` | yes | drop slack absorber. |
| `EncounterIntroScreen` | yes | drop slack absorber. |
| `EncounterVictoryScreen` | yes | drop slack absorber. |
| `VictoryScreen` | yes | drop slack absorber. |
| `MenuScreen` | no | banner anchors visually; status would compete. |
| `CombatScreen` (play) | no | full-bleed gameplay; out of scope. |

`src/app.tsx` wraps the whole route switch in `<SaveProvider save={save}>`
so every screen rendered through the route gets save context. Concretely,
the `App` body is refactored to compute a single `routeJsx` value
(switching on `route.kind`) and return:

```tsx
return (
  <SaveProvider save={save}>
    <box flexDirection="column" flexGrow={1}>
      <box flexGrow={1}>{routeJsx}</box>
      {progressUnwritable ? <text>⚠ progress not saved</text> : null}
    </box>
  </SaveProvider>
);
```

This collapses the eight near-identical wrapper trees in the existing
`App` into one, which is a small but real readability win and the only
place the provider needs to live.

The `progressUnwritable` warning row stays where it is (below the
screen wrapper). When shown, it pushes the StatusBar up by one row —
this is acceptable because save-write failures are exceptional and the
warning belongs at the very bottom of the terminal.

## 5. Cleanup of the previous iteration

The iteration-2 chrome bar is superseded by this design. Specifically:

- **Delete:** `src/components/ChromeBar.tsx`,
  `tests/components/ChromeBar.test.ts`.
- **Rewrite:** `src/components/Screen.tsx` — drops `ChromeBar` import,
  adds `screen` prop, swaps inner box wrapper for a scrollbox, pins
  `<StatusBar>` at the bottom, drops default `gap={1}` on the inner
  column.
- **Update:** the six migrated screens lose their `[esc] ...`-style
  hint footers (already done in iteration 2) but also lose their
  `<box flexGrow={1} />` slack absorbers and any local
  `<scrollbox flexGrow={1}>` (StatsScreen, StorySelectScreen).
- **Update:** `tests/components/Screen.test.ts` — the
  `DEFAULT_SCREEN_WIDTH === 64` assertion stays; no other Screen-level
  tests apply.

This is forward refactoring, not a `git revert`. Iteration-2 commits
remain in history as the record of why we landed here.

## 6. Module structure

- New: `src/components/StatusBar.tsx` — ~60 lines (info-row helper,
  hint-row, `useTerminalDimensions` integration, narrow fallback).
- New: `src/components/SaveContext.tsx` — ~25 lines (provider + hook +
  pure helper).
- Updated: `src/components/Screen.tsx` — ~25 lines after rewrite.
- Updated: `src/app.tsx` — collapse per-route wrapper trees into a
  single `routeJsx` + one outer `<SaveProvider>` shell.
- Updated: 6 screen files — each migrated to the §3 pattern (drop
  slack absorbers + local scrollboxes; add `screen` prop).
- Deleted: `src/components/ChromeBar.tsx`,
  `tests/components/ChromeBar.test.ts`.
- New: `tests/components/StatusBar.test.ts` — tests pure helpers
  (info-row builder + narrow fallback).
- New: `tests/components/SaveContext.test.ts` — tests the
  `computeLifetime(save)` helper against fixture saves.
- Updated: `tests/components/Screen.test.ts` — keeps the
  `DEFAULT_SCREEN_WIDTH` assertion only.

No new directories. No barrel files.

## 7. Implementation spike

Before bulk migration, prove the universal scrollbox renders cleanly in
both regimes:

- **Short content** (e.g. `VictoryScreen`, ~4 lines) — verify no
  scrollbar artifact, no extra padding row, content sits at the top of
  the scrollbox area without overflow indicator.
- **Overflowing content** (e.g. `StatsScreen` with full trait list on a
  short terminal) — verify scrolling works, status bar stays pinned,
  trait rows don't clip the StatusBar.

Pace's scrollbox usage in `pace/src/ui/tabs/CardsTab.tsx` is preceded by
`// @ts-nocheck`, suggesting the gridland scrollbox typings are loose;
the spike proves runtime behavior matches the spec's intent before we
commit to wrapping every screen in one. If the spike surfaces issues,
fall back to per-screen `<box flexGrow={1} />` slack absorbers and
keep local scrollboxes only where overflow is expected (Stats,
StorySelect) — the rest of the spec stays unchanged.

## 8. Tests

The codebase tests pure helpers extracted from components, not rendered
React. Continue that pattern.

### `tests/components/StatusBar.test.ts`

Extract two pure helpers:

```ts
export function formatStatusInfoRow(
  brand: string,
  screen: string,
  slain: number,
  sessions: number,
  width: number,
): string;

export function formatStatusHintRow(hints: string, width: number): string;
```

Tests for `formatStatusInfoRow`:

- Full row at terminal width 80 renders
  `─── regxslayer · stats · 12 slain · 3 sessions ─────...─` filled to
  width.
- Narrow fallback drops `sessions`, then `slain`, then `screen`,
  leaving `─── regxslayer ───...─` as the floor.
- Cutoff thresholds tested on both sides for each segment drop.

Tests for `formatStatusHintRow`:

- Empty `hints` → blank row of width spaces (so vertical rhythm is
  preserved).
- Non-empty `hints` → left-padded by 1 space, right-filled to width.

### `tests/components/SaveContext.test.ts`

Extract a pure helper:

```ts
export function computeLifetime(save: SaveFile): { slain: number; sessions: number };
```

Tests cover:

- Sums `storyKills + encounterKills` correctly.
- Returns `encounterSessions` directly.
- Handles a fresh save (all zeros).

The provider/hook themselves are not unit-tested; they're a thin
context wrapper around `computeLifetime`.

### `tests/components/Screen.test.ts`

Reduced to a single assertion: `DEFAULT_SCREEN_WIDTH === 64`. The JSX
has no remaining conditional logic worth a unit test.

### Per-screen tests

Existing screen-internal tests (e.g. `renderStatsRowText`,
`flattenEntries`, etc.) cover row-rendering and selection logic. The
migration changes only the outer wrapper, so those tests stay green
without modification.

## 9. Out of scope

- Color / styling for the status bar (monochrome only for now).
- Per-screen status icons or live indicators (e.g. "● recording").
- Context-aware status that adapts content per-screen beyond the
  `screen` label (e.g. progress percentages, current chapter).
- Migrating the Menu or CombatScreen.
- Centralized hint registry / shared hint constants.
- Animations on status transitions.
- Localization of hint or screen-label strings.
- Replacing the `progressUnwritable` warning row with a status-bar
  indicator.
