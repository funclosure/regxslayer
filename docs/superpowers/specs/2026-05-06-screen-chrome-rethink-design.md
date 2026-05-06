# Screen Chrome Rethink — Design

A second-pass rethink of the cross-screen layout. Adds a persistent
top chrome bar and standardizes a top-anchored screen structure to
eliminate the "content jumping up and down between screens" problem
left by the first iteration.

- **Status:** design approved 2026-05-06, pending implementation plan.
- **Replaces:** `docs/superpowers/specs/2026-05-06-screen-layout-component-design.md`
  (the original `Screen` wrapper). The previous spec's `centerVertically`
  prop is removed entirely; that approach made content "jump" between
  navigations because each screen sat at a different vertical position.

## 1. Concept

The first iteration centered each screen's content (vertically for
cinematic screens, horizontally for list screens) inside a
fixed-width column. Live testing showed this *worsens* the user's
sense of place: every navigation moves the content block to a new
vertical position, and the eye has to re-find where things are.

The principle this rethink commits to:

> **Reduce eye travel. Maximize cohesion.** Every non-Menu screen
> should feel like the same frame, with the same anchor points.
> Screens may differ in *what* they show, but not in *where* they
> show it.

The way to achieve this — borrowed from `pace`'s App shell pattern
(`/Users/victor/Documents/Workspace/Projects/pace/src/ui/App.tsx`) —
is to give every screen three stable visual anchors:

1. A persistent **chrome bar** at the very top (row 0) — always
   visible, always identical brand on the left, screen-specific
   hints on the right.
2. A predictable **title** position — first row of content,
   always at the same offset below the chrome.
3. A predictable **footer** position — last row of content,
   always pinned to the bottom of the column.

Between title and footer, content fills top-down, with a
`flexGrow={1}` slack absorber consuming whatever vertical space is
left. Short content sits near the top with empty air below; long
content fills naturally; very long content uses a `scrollbox` to
stay within the slack region. The shape never changes.

The Menu is exempt from the chrome (it's the title screen and has
its own block-letter banner anchoring the view).

## 2. Components

### 2.1 `<ChromeBar hints={...} />`

New component at `src/components/ChromeBar.tsx`.

```ts
type ChromeBarProps = {
  /** Right-aligned hint text, e.g. "[esc] back · [?] help". */
  hints: string;
};
```

Renders one row, full terminal width, monochrome:

```
─── regxslayer ─────────────────────── [esc] back · [?] help ───
```

Layout:

- 3 dashes + space + `regxslayer` + space — left segment, ~17 chars
- space + `hints` + space + 3 dashes — right segment, hint-length-dependent
- middle: dashes filling the remaining width

Width comes from the terminal — the chrome takes whatever the host
gives it. The component accepts no width prop; it stretches to
`width="100%"`.

### 2.2 `<Screen hints={...}>` (updated)

Updated component at `src/components/Screen.tsx`. The signature
changes:

```ts
type ScreenProps = {
  children: React.ReactNode;
  /** Right-aligned chrome hint, e.g. "[esc] back · [?] help". */
  hints: string;
  /** Inner column width in characters. Default `DEFAULT_SCREEN_WIDTH` (64). */
  width?: number;
};
```

The `centerVertically` prop is **removed**. Vertical placement is no
longer a per-screen decision — every Screen is top-anchored below
the chrome.

Render:

```tsx
<box flexDirection="column" flexGrow={1} width="100%">
  <ChromeBar hints={hints} />
  <box flexDirection="column" flexGrow={1} alignItems="center" padding={2}>
    <box flexDirection="column" width={width} flexGrow={1} gap={1}>
      {children}
    </box>
  </box>
</box>
```

The inner column gets `flexGrow={1}` so it fills the content area
vertically. Children control where slack is absorbed (a
`<box flexGrow={1} />` spacer or a `<scrollbox flexGrow={1}>` does
that work).

`gap={1}` on the inner column gives one-row spacing between
top-level children by default. Screens that want zero gap between
adjacent rows (e.g. title + separator) can wrap those rows in their
own `<box flexDirection="column" gap={0}>`.

## 3. Per-screen structure

Every non-Menu screen follows this shape:

```tsx
<Screen hints="...">
  <text>TITLE</text>
  <text>──────</text>           {/* underline */}

  {/* main content — top-anchored, multiple rows */}

  <box flexGrow={1} />           {/* slack absorber */}

  <text>...footer hint...</text> {/* optional */}
</Screen>
```

Three positional invariants enforced by the structure:

- Title and underline render at the same row across all screens
  (chrome height + outer padding-top + inner gap).
- Footer pins to the bottom of the inner column (chrome height +
  terminal height − padding-bottom − 1).
- Empty space, when present, sits between content and footer —
  never above content.

### Variants

**Long list screens (Stats, StorySelect)** — replace the bare
`<box flexGrow={1} />` slack absorber with a scrollbox so long
lists can overflow gracefully:

```tsx
<Screen hints="[r] reset · [esc] back">
  <text>STATS</text>
  <text>───────</text>
  <text>Lifetime: ...</text>
  <text>Sessions: ...</text>
  <scrollbox flexGrow={1}>
    {traitRows.map(...)}
  </scrollbox>
</Screen>
```

The scrollbox takes the slack instead of empty whitespace and
prevents the trait list from clipping the chrome on a short
terminal. Scrollbox usage matches `pace/src/ui/tabs/CardsTab.tsx`.

**Short list screens (TutorialSelect, EncounterIntro)** — content
is short enough that a scrollbox is overkill; use the bare
slack-absorber pattern.

**Cinematic screens (Victory, EncounterVictory)** — same shape as
the others. Content sits top-anchored below the chrome, horizontally
centered within the 64-wide column via an inner box. The
"vertically-centered stage moment" of the previous iteration is
deliberately given up to keep cohesion. The screens are short (4–6
lines) so the result is a small block of cinematic text at the top,
with empty air below. The chrome above and the consistent positioning
across navigations are what carry the visual structure now.

```tsx
<Screen hints="any key advances · [esc] menu">
  <text>SLAIN</text>
  <text>───────</text>
  <box alignItems="center" gap={1} flexDirection="column">
    <text>{monsterName}</text>
    <text>Encounter #{sessionNumber} · kill {killNumberInSession} of this session</text>
  </box>
  <box flexGrow={1} />
  <text>any key advances · [esc] main menu</text>
</Screen>
```

### Hints per screen

Each screen passes a `hints` string to `<Screen>`. Initial
assignments:

| Screen | hints |
|---|---|
| StatsScreen | `[r] reset · [esc] back` |
| StorySelectScreen | `[↑↓] move · [⏎] enter · [esc] back` |
| TutorialSelectScreen | `[↑↓] move · [⏎] start · [esc] back` |
| EncounterIntroScreen | `[⏎] begin · [esc] back` |
| EncounterVictoryScreen | `any key advances · [esc] menu` |
| VictoryScreen | `[⏎] continue` |

Screens may also keep their existing inline hint footers if the
duplication aids discoverability; the chrome version is the always-on
reminder.

## 4. Migration scope

| Screen | Wrap with `<Screen>`? | Notes |
|---|---|---|
| `StatsScreen` | yes | scrollbox variant. |
| `StorySelectScreen` | yes | scrollbox variant. |
| `TutorialSelectScreen` | yes | bare slack-absorber. |
| `EncounterIntroScreen` | yes | bare slack-absorber. |
| `EncounterVictoryScreen` | yes | cinematic variant. |
| `VictoryScreen` | yes | cinematic variant. |
| `MenuScreen` | no | banner anchors visually; chrome would compete. |
| `CombatScreen` (play) | no | full-bleed gameplay; out of scope. |
| `CombatScreen` (intro) | no | optional follow-up. |

## 5. Cleanup of the previous iteration

The previous iteration's `centerVertically` attempt
(commits `34b9350`/`3ec4051` indirectly, `7529a8a` directly) is
superseded by this design. Specifically:

- `Screen.tsx` is rewritten to remove `centerVertically` and add the
  `hints`-driven chrome wrap.
- `tests/components/Screen.test.ts` is rewritten — `screenOuterBoxProps`
  no longer takes a `centerVertically` argument; new tests cover the
  chrome composition or are dropped if no testable seam remains.
- The four list screens lose their `centerVertically` prop (added in
  `7529a8a`) — that prop no longer exists.
- The two cinematic screens lose their `centerVertically` prop and
  restructure their inner box to the cinematic variant pattern in §3.

This is forward refactoring, not a `git revert`. The intermediate
commits stay in history as the record of why we landed here.

## 6. Module structure

- New: `src/components/ChromeBar.tsx` — ~30 lines.
- Updated: `src/components/Screen.tsx` — ~35 lines after the rewrite.
- Updated: 6 screen files — each migrated to the §3 pattern.
- New: `tests/components/ChromeBar.test.ts` — tests the pure helper that
  builds the chrome row text (see §7).
- Updated: `tests/components/Screen.test.ts` — adapted to the new API.

No new directories. No barrel files.

## 7. Tests

The codebase tests pure helpers extracted from components, not
rendered React. Continue that pattern.

### `tests/components/ChromeBar.test.ts`

Extract a pure helper `formatChromeRow(brand, hints, width)` returning
the rendered string. Test:

- Returns `─── regxslayer ─...─ <hints> ───` filled to `width`.
- Empty `hints` → only the brand on the left, dashes filling the rest
  (`─── regxslayer ─────...─────`).
- Narrow-terminal fallback: when `width` is less than
  `brand.length + hints.length + 12` (8 dashes + 4 spaces of structure),
  the hints are dropped entirely and the row renders as
  `─── <brand> ─────...─────`. No ellipsis, no partial hints — either
  the full hint fits or it disappears. Test covers both sides of the
  cutoff.
- Width below `brand.length + 8` is below the supported terminal-width
  budget (76 chars) and not tested.

### `tests/components/Screen.test.ts`

Rewrite the existing tests. Drop assertions about
`screenOuterBoxProps(centerVertically)`. Add (or keep) one of:

- A pure helper `screenOuterBoxProps()` returning the now-fixed outer
  box props (no conditional).
- A pure helper that builds the chrome props from the `hints` string.

If the JSX has no remaining conditional logic worth a unit test,
shrink the file to just the `DEFAULT_SCREEN_WIDTH` constant test and
the helper exists only for documentation.

### Per-screen tests

Existing screen-internal tests (e.g. `renderStatsRowText`) continue to
cover their respective behaviors. The migration changes only the
outer wrapper, not the row-rendering helpers, so those tests stay
green without modification.

## 8. Out of scope

- Color / styling for the chrome bar (monochrome only for now).
- Stats / kill counts in the chrome (option B from brainstorming).
- Context-aware chrome that adapts per-screen (option C).
- Migrating the Menu or CombatScreen.
- Centralized hint registry / shared hint constants.
- Animations on chrome or screen transitions.
- Localization of hint strings.
