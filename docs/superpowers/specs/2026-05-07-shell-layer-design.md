# Shell Layer — Design

A high-level shell component that gives every screen — combat, menu,
selects, victories — the same persistent frame: a single live scene
above, a one-line status row, and a bordered **input panel** at the
bottom that hosts whatever interaction the current screen needs.

- **Status:** design draft 2026-05-07, pending user approval.
- **Builds on:** `2026-05-06-claude-code-layout-design.md` (bottom-anchored
  StatusBar, SaveContext, scrollbox-based content area). This spec
  extends that work with a unified input panel and brings the two
  previously-exempt screens (Menu, CombatScreen) into the shell.
- **Replaces (in scope only):** the bespoke layouts in
  `MenuScreen.tsx` and `CombatScreen.tsx`. The previous spec's
  `Screen` component is repurposed as the shell's scene slot.

## 1. Concept

Every screen in regxslayer has the same three jobs:

1. **Show a scene** — title art, monster body, stats table, victory
   flourish.
2. **Surface the screen identity** — where am I, what's my progress.
3. **Take input** — type a regex, pick from a list, press enter to
   continue.

Today each screen wires those three jobs ad-hoc:

- Combat has its own two-column scene + a free-text regex input + a
  feedback stack + banners that swap in on phase changes.
- Menu has a hand-laid centered ASCII layout with no `Screen` wrapper at
  all.
- The other six screens use `Screen` for the scene + StatusBar for
  identity, and bake their input affordance into the scene as plain
  text rows (`▶ Story`, `[r] reset`, `[⏎] continue`).

The result: cross-screen visual chrome is split between StatusBar
(consistent) and per-screen input rendering (divergent). Players have
to relearn *where input lives* every time they change screen.

The principle:

> **One persistent input surface across every screen.** Where the
> input lives never changes — only its mode does. The scene above is
> free to be a body view, a title screen, a stats table, or a victory
> flourish; the bottom is always the same bordered panel.

The shape borrows from Claude Code's TUI: a transcript or scene above,
a status line, then a persistent input bar at the bottom that
transforms (text input vs. AskUserQuestion-style choice list) without
moving.

## 2. Anatomy

```
┌──── scene  (live, swaps on screen transition) ────────────────────┐
│                                                                   │
│   monster body / title art / stats table / victory flourish       │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
─── regxslayer · combat · 2 slain · 1 sessions ────────────────────  ← status (unchanged)
╭─ optional header label ───────────────────────────────────────────╮
│                                                                   │
│   panel body — text input | choice list | prompt | banner         │
│                                                                   │
│ ─ footer hints ─────────────────────────────────────────────────  │
╰───────────────────────────────────────────────────────────────────╯
```

Three regions, top to bottom:

### 2.1 Scene (top, flex-grow)

A free-form region the screen owns. Existing combat, menu, and stats
layouts move into the scene unchanged; the shell does not impose a
column or padding contract on the scene.

The scene **does not host any input affordance**. No `▶` cursor on
selectable rows, no regex input, no `[r] reset` hint. Those all live
in the panel.

The shell provides scrolling for screens whose scene exceeds the
available height (inherited from the existing `<scrollbox>` in
`Screen`). Combat opts out of scrolling because its layout is exactly
sized to the available space.

### 2.2 Status row (one row, fixed)

Unchanged from the prior `claude-code-layout` spec:

```
─── regxslayer · <screen> · <N> slain · <M> sessions ──────────────
```

Width-adaptive (drops `sessions`, then `slain`, then `<screen>`,
right-to-left). The hints row is **dropped** — hints now live in the
panel footer (§2.3), so the status block becomes one row instead of
two. This frees a row for content on the 80×20 minimum case.

### 2.3 Input panel (bottom, sized to mode)

A bordered box with rounded corners (`╭╮╰╯`), full terminal width,
height varies by mode. The panel has four optional regions:

```
╭─ header ──────────────────────────────────────────────────────────╮
│                                                                   │
│   body                                                            │
│                                                                   │
│ ─ footer ────────────────────────────────────────────────────────  │
╰───────────────────────────────────────────────────────────────────╯
```

- **Header** (optional, single row baked into the top border): a label
  for the panel — chapter cheatsheet name, "Choose your fight",
  confirm question. Omitted when the panel needs no label (combat
  typing, simple menu).
- **Body** (variable rows): the content for the current mode.
- **Footer hints** (optional, single row): keybinding reminders baked
  into a horizontal rule above the bottom border (`─ [↑↓] move · [⏎]
  choose ─`). Omitted only for the lightest `prompt` mode.

The panel is the only place where keybindings are surfaced as text;
the StatusBar's hint row goes away.

## 3. Panel modes

Five concrete modes. Each is implemented as a dedicated React
component that the shell composes inside the panel body.

### 3.1 `text` — free-text input with feedback

Used by: combat (typing phase).

Layout:

```
╭───────────────────────────────────────────────────────────────────╮
│ › cat|                                                            │
│   1/3 vitals · collateral 0 · dmg 6                               │
│   ◆ a clean strike                                                │
│ ─ [tab] hint · [esc] flee ─────────────────────────────────────  │
╰───────────────────────────────────────────────────────────────────╯
```

Composition:

- `›` prompt glyph + `<input>` row.
- Numeric feedback row (existing `FeedbackLine` numeric output).
- Symbolic feedback row (existing `FeedbackLine` symbolic glyph + label).
- Footer hints.

The `RegexInput` invalid-warning row stays inside `text` mode (renders
between the input and the numeric feedback when present). `HeartSparks`
also renders inside `text` mode during the heart phase, between the
symbolic feedback and the footer.

Height: 5 rows (4 content + 1 footer) when nothing extra is showing;
6–7 rows with invalid warning or heart sparks.

### 3.2 `choice` — vertical list with cursor

Used by: menu, story-select, tutorial-select, stats reset confirm.

Layout:

```
╭─ Choose your fight ───────────────────────────────────────────────╮
│   Chapter 1 — Literals & Anchors  2/4                             │
│     ✓ Lump                                                        │
│     ✓ Pip                                                         │
│     · Bop                                                         │
│ ▶   · Cog                                                         │
│ ─ [↑↓] move · [⏎] enter · [esc] back ──────────────────────────  │
╰───────────────────────────────────────────────────────────────────╯
```

Composition:

- Optional header (panel header label).
- Vertical list of items. Each item: 1 row, prefixed by `▶ ` (focused)
  or `  ` (others). Items may include section headings (non-selectable
  rows that render without the prefix slot).
- Footer hints.

Behavior:

- Up/Down navigates focused item, skipping section headings.
- Enter triggers the item's action.
- Esc fires `onCancel` (back to previous screen).
- The list scrolls **inside the panel** when items exceed available
  height. The focused row stays in view; a `▼ more below` /
  `▲ more above` indicator renders at the boundary.

Max panel height for `choice` mode: **half of the terminal height**.
Above that, items scroll inside. This keeps the scene above visible at
all times — long lists do not consume the whole screen.

### 3.3 `prompt` — single-line hint

Used by: stats default, encounter intro, encounter-victory, victory,
combat intro.

Layout:

```
╭───────────────────────────────────────────────────────────────────╮
│   [r] reset · [esc] back                                          │
╰───────────────────────────────────────────────────────────────────╯
```

A bordered box with a single dim-rendered hint row. No header, no
footer — the hint *is* the body.

Height: 3 rows (2 borders + 1 row).

### 3.4 `banner` — celebratory shimmer (combat only)

Used by: combat strip / kill banners.

Layout:

```
╭───────────────────────────────────────────────────────────────────╮
│                                                                   │
│       ✓  L A Y E R   S T R I P P E D — literals                   │
│       matched by:  cat                                            │
│                                                                   │
╰───────────────────────────────────────────────────────────────────╯
```

The existing `ShimmerBanner` component renders inside the panel body
in place of the `text`-mode rows for `BANNER_DURATION_MS` (~1500ms),
then the panel returns to `text` mode.

Height: matches `text` mode's base size (5 rows) so the panel
doesn't visually jolt when transitioning in/out of a banner. The
banner has visual padding rows top and bottom inside the same height
envelope. A 1-row settle is still possible when transitioning from
`text`-with-active-`HeartSparks` (~6–7 rows) into `banner` (5 rows);
this is acceptable and matches today's behavior.

### 3.5 `cheatsheet` — chapter regex hints (combat only)

Used by: combat tab-toggle.

Layout:

```
╭─ literals & anchors · cheatsheet ─────────────────────────────────╮
│   abc / ^abc / abc$       literals + anchors                      │
│   a|b / (a|b)             alternation + groups                    │
│   \d \w \s                char classes                            │
│   [abc] [^abc] [a-z]      sets and ranges                         │
│ ─ [tab] back to combat ──────────────────────────────────────────  │
╰───────────────────────────────────────────────────────────────────╯
```

Composition:

- Header = chapter name + " · cheatsheet".
- Body = chapter cheatsheet rows (existing `chapter.cheatsheet`).
- Footer = single hint to toggle off.

Height: matches the chapter's cheatsheet length + 2 borders + 1
footer. Typically 6–8 rows.

## 4. Per-screen mapping

Every screen in the app maps to a `(scene, panel-mode)` pair. The
shell owns the status row.

| Screen | Scene content | Panel mode | Panel header |
|---|---|---|---|
| MenuScreen | title art + monster + chapters band + tagline | `choice` | — |
| StorySelectScreen | optional context (current chapter flavor / stats blurb) | `choice` | "Choose your fight" |
| TutorialSelectScreen | small disclaimer text | `choice` | "Pick a teacher" |
| EncounterIntroScreen | description text | `prompt` | — |
| StatsScreen (default) | lifetime totals + trait stats table | `prompt` | — |
| StatsScreen (confirming) | lifetime totals + trait stats table | `choice` | "Reset all trait stats? This cannot be undone." (items: No, keep them / Yes, reset) |
| CombatScreen (intro) | portrait + name + flavor | `prompt` | — |
| CombatScreen (typing) | body view + side rail | `text` | — |
| CombatScreen (strip) | body view + side rail | `banner` | — |
| CombatScreen (kill) | body view + side rail | `banner` | — |
| CombatScreen (cheatsheet) | body view + side rail | `cheatsheet` | "<chapter> · cheatsheet" |
| VictoryScreen | "VICTORY" + monster name | `prompt` | — |
| EncounterVictoryScreen | "SLAIN" + monster + session info | `prompt` | — |

A few notes on the trickier cells:

- **MenuScreen scene** keeps the existing centered title art and
  chapters band. The "[↑↓] move · [⏎] choose · [q] quit" line moves
  out of the scene and into the panel footer. The "▶ Story" cursor
  row also moves: the menu list is the panel body, not part of the
  splash.
- **StorySelectScreen** uses the panel header "Choose your fight".
  The chapter rows become non-selectable section headings inside the
  list, with monsters underneath. Locked chapters render their
  heading dimmed and have no monsters underneath. The scene above is
  intentionally sparse for v1 — empty whitespace inside `SceneFrame`,
  since the status row already carries lifetime stats. Showing the
  focused monster's portrait or a chapter-flavor blurb in the scene
  is an explicit follow-up, not part of this design.
- **EncounterIntroScreen** keeps its static description in the scene
  and uses `prompt` mode for the keybindings (`[⏎] begin · [esc]
  back`) — same single-press flow as today. We considered a `choice`
  panel with explicit Begin / Back items but it adds an arrow-key step
  for no benefit.
- **StatsScreen** ships two distinct panel states. The default shows
  a `prompt` mode with `[r] reset · [esc] back`. Pressing `r` swaps
  the panel into `choice` mode with the confirm question as header.
  No separate `footer={...}` slot on `Screen` is needed; the panel
  *is* the confirm UI.
- **CombatScreen banner** sits in the panel rather than in the scene
  (today the `ShimmerBanner` renders directly under the body view).
  This means the body view stays visible underneath the banner —
  desirable, because the player's eye can verify which layer just got
  stripped.
- **CombatScreen cheatsheet** also moves from a scene-level overlay
  to the panel. Today's `HintOverlay` covers the regex input area
  inside the right column; under the shell it replaces the panel body
  while leaving the scene intact. Behaviorally identical (tab to
  toggle), visually consistent with other panel modes.

## 5. Responsive behavior

### 5.1 Minimum (80×20)

Validated tight case:

- Status row: 1.
- Panel: 5 rows for `text`-mode combat; 7 rows for `choice`-mode menu
  (5 items + footer + 1 border).
- Scene: remainder (~13 rows for combat, ~12 for menu).

Combat fits the body view + 28-col side rail in 13 rows. Menu fits
the title art (5 rows) + monster art beside chapters band (5 rows) +
tagline (1 row) in 11 rows, with 1 row of breathing room.

The previous min-width screen ("regxslayer needs at least 80×20") in
`cli.tsx` stays unchanged.

### 5.2 Typical (~110×28)

Comfortable case. The panel gains internal padding rows above/below
its body content (visual breathing room around the input row, the
choice list, the banner). The scene gets vertical padding around its
top.

### 5.3 Wide (160×42+)

Two regimes:

- **Combat**: scene stretches naturally (existing `flexGrow={1}` on
  the right column), so the body view fills available width. Panel
  borders also stretch full width. **Content inside** the panel
  (regex input, feedback rows) stays left-aligned under the `›`
  prompt; the row simply has more room to the right.
- **Non-combat screens**: the entire shell (status + scene + panel)
  caps at **140 columns** centered, with empty terminal margins on
  either side above 140. This matches the centered max-width approach
  the existing `Screen` component already uses (`DEFAULT_SCREEN_WIDTH
  = 64` for inner content) but raises the cap for the new shell so
  the panel has room.

The combat exemption is intentional: combat's body view is the only
place where horizontal stretching adds gameplay value (more room for
matched-substring underlines, more room for the side rail labels).
Everywhere else, capping prevents 200-column-wide choice lists that
look adrift.

The cap is implemented as a flag on the shell:

```ts
type ShellProps = {
  scene: React.ReactNode;
  panel: React.ReactElement; // text | choice | prompt | banner | cheatsheet
  screen: string;            // for status row
  capWidth?: boolean;        // default true; combat passes false
};
```

## 6. Components

New components, all under `src/components/shell/`:

- `Shell.tsx` — top-level frame component. Composes scene, status,
  and panel; handles the wide-terminal cap.
- `InputPanel.tsx` — bordered panel chrome (header / body slot /
  footer hints / borders). Mode-agnostic; takes mode-specific
  components as children for the body.
- `panel/TextInput.tsx` — `text` mode: regex input + feedback rows.
  Wraps existing `RegexInput`, `FeedbackLine`, `HeartSparks`.
- `panel/ChoiceList.tsx` — `choice` mode: scrollable vertical list
  with cursor and section-heading support.
- `panel/Prompt.tsx` — `prompt` mode: single dim hint row.
- `panel/BannerSlot.tsx` — `banner` mode: thin wrapper that hosts the
  existing `ShimmerBanner` inside the panel body.
- `panel/Cheatsheet.tsx` — `cheatsheet` mode: chapter cheatsheet
  rows.

Migrated components:

- `StatusBar.tsx` — drops the hint row (becomes one row, not two).
  The `formatStatusHintRow` helper and its tests are removed.
- `Screen.tsx` — replaced. A new `SceneFrame.tsx` is added under
  `src/components/shell/` with the scene-only logic (centered 64-col
  column + `<scrollbox>`); the old `Screen.tsx` and its
  StatusBar-pinning + `footer` props go away. Story-select,
  tutorial-select, stats, encounter-intro, and the two victory
  screens use `<SceneFrame>` for their scene region. MenuScreen and
  CombatScreen pass their scene content to the shell directly,
  without a `SceneFrame`. The status-bar pinning logic moves into
  `Shell`.

The 64-col `DEFAULT_SCREEN_WIDTH` becomes the default *scene* width
for `SceneFrame`; the 140-col cap is the default *shell* width.

## 7. Migration plan

Staged so each step is shippable.

### Stage 1 — Build the shell, validate on one screen

1. Implement `Shell`, `InputPanel`, the five panel-mode components,
   and `SceneFrame` under `src/components/shell/`. Leave the old
   `Screen.tsx` in place so existing screens keep rendering.
2. Migrate `EncounterVictoryScreen` to `Shell` first — it's the
   simplest screen (scene = 4 lines, panel = `prompt` mode).
3. Verify rendering at 80×20 / 110×28 / 160×42.

If the panel chrome doesn't render cleanly across sizes, fix here
before propagating.

### Stage 2 — Migrate the remaining `Screen`-based pages

`StatsScreen`, `StorySelectScreen`, `TutorialSelectScreen`,
`EncounterIntroScreen`, `VictoryScreen`. All use `prompt` or `choice`
mode. The previous spec's `<Screen>` wrapper is replaced screen-by-
screen with `<Shell>`.

`StatsScreen`'s `confirming` boolean now picks between two `panel`
props (prompt vs. choice) instead of toggling a `footer`.

### Stage 3 — Migrate MenuScreen

The menu's hand-laid `buildLandingRows` becomes a scene component
(`MenuSplash`) that just renders the title art, monster, chapters
band, and tagline. The menu's keyboard handling and item list move
into a `choice`-mode panel.

This is the first time the menu has ever had the StatusBar; the
splash gives up one or two rows of vertical space to accommodate it.
The previous spec exempted the menu specifically because the splash
was visually self-anchoring; under the shell, the panel + status are
the new anchors.

### Stage 4 — Migrate CombatScreen

The most invasive step. Combat moves into the shell with `capWidth=
false`:

- Scene: the existing two-column layout (28-col side rail + body
  view), unchanged. The `ShimmerBanner` and `HintOverlay`
  rendering moves out of the right column.
- Panel: switches between `text`, `banner`, `cheatsheet`, and
  `prompt` (intro phase) based on `engine.state.phase` and the
  hint-toggle local state.

`CombatScreen` becomes a router that selects the right panel mode;
the visual primitives (`ShimmerBanner`, `RegexInput`, `FeedbackLine`,
`HeartSparks`, `HintOverlay`) keep their existing implementations.

### Stage 5 — Cleanup

- Delete `src/components/Screen.tsx` and `tests/components/Screen.test.ts`
  (every screen now uses `<Shell>`, with `<SceneFrame>` where the
  scene needs the centered column).
- Delete `formatStatusHintRow` and its tests from `StatusBar.tsx` /
  `tests/components/StatusBar.test.ts`.
- Confirm `app.tsx` route switch still works (the existing
  `SaveProvider` wrapper stays; routes now return `<Shell>`-rooted
  trees instead of `<Screen>`-rooted ones).

## 8. Tests

Continue the codebase pattern: extract pure helpers from components,
test those.

### `tests/components/shell/Shell.test.ts`

Tests `computeShellWidth(terminalWidth, capWidth)`:

- Returns `terminalWidth` when `capWidth=false`.
- Returns `min(terminalWidth, 140)` when `capWidth=true`.
- Handles edge cases (terminalWidth = 80, 140, 141, 200).

### `tests/components/shell/InputPanel.test.ts`

Tests pure border builders:

- `formatPanelTopBorder(width, header?)` — rounded corners, optional
  header label embedded.
- `formatPanelBottomBorder(width)` — rounded corners.
- `formatPanelFooterRule(width, hints?)` — horizontal rule with
  optional hints embedded.

### `tests/components/shell/ChoiceList.test.ts`

Tests pure helpers:

- `navigateChoiceList(items, currentIdx, direction)` — skips section
  headings, wraps top/bottom.
- `computeScrollWindow(items, focusedIdx, maxRows)` — returns the
  visible window + boundary indicators.

### Existing tests

The existing screen-internal tests (`renderStatsRowText`,
`flattenEntries`, `formatRoadmapRow`, `formatBodyRow`, etc.) stay
green — none of them touch the wrapper layer.

The existing `formatStatusInfoRow` tests stay; `formatStatusHintRow`
tests are deleted alongside the helper.

## 9. Out of scope

- New color palette / accent color (current monochrome carries over;
  green/red stay reserved for combat semantics — vital matches /
  collateral / DANGER strikethrough).
- Animation on panel mode transitions (the panel snaps between modes
  the same way today's screens snap between phases).
- Dragging / resizing the panel.
- A "transcript" mode where prior screens stack above the current
  scene — explicitly rejected (option B was chosen over a Claude-Code-
  style accumulating transcript).
- Mouse / click interaction with panel choices (keyboard only).
- Localization of hint or label strings.
- Customizing the panel border style (rounded `╭╮╰╯` is the only
  border style; the scene above keeps square `┌┐└┘` if its content
  uses borders).
- Replacing the `progressUnwritable` warning row with a panel state.
