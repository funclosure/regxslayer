# Screen Layout Component — Design

A shared `Screen` wrapper component that gives every text-list screen a
consistent centered max-width column, replacing the divergent
top-left vs. centered styling currently scattered across screens.

- **Status:** design approved 2026-05-06, pending implementation plan.
- **Scope:** new `src/components/Screen.tsx` plus migration of six
  existing screens. No behavior changes inside the screens themselves.

## 1. Concept

The Home screen now renders as a centered, fixed-width composition.
Most other screens still render top-left (`StatsScreen`,
`StorySelectScreen`, `TutorialSelectScreen`, `EncounterIntroScreen`),
and the two that already center content do so each in their own
slightly different way (`VictoryScreen`, `EncounterVictoryScreen`).
Looking across the game, screens feel like they belong to different
apps.

The fix is a single layout primitive — `<Screen>` — that owns the
"this is a regxslayer screen" framing: outer flex with breathing-room
padding, content centered horizontally, content sized to a stable
column. Every list-style screen gets wrapped in it; cinematic and
gameplay screens that have their own intentional layout are left
alone.

The goal is consistency, not visual reskin. No new colors, no new
chrome (no titlebar, no statusbar). The contract is purely positional.

## 2. Component

### File

`src/components/Screen.tsx`. Sits next to other shared TUI primitives
(`HpBar.tsx`, `MonsterPortrait.tsx`, etc.).

### Props

```ts
type ScreenProps = {
  children: React.ReactNode;
  /** Inner column width in characters. Default 64. */
  width?: number;
  /** Centers content vertically as well as horizontally. Default false. */
  centerVertically?: boolean;
};
```

### Render

```tsx
export function Screen({
  children,
  width = 64,
  centerVertically = false,
}: ScreenProps): React.ReactElement {
  return (
    <box
      flexDirection="column"
      flexGrow={1}
      padding={2}
      alignItems="center"
      {...(centerVertically ? { justifyContent: "center" } : {})}
    >
      <box flexDirection="column" width={width}>
        {children}
      </box>
    </box>
  );
}
```

### Behavior

- The outer box fills the terminal (`flexGrow={1}`), pads by 2 on all
  sides, and centers its single child horizontally.
- The inner box is exactly `width` chars wide. All content rendered as
  children sits left-aligned inside this stable column.
- When `centerVertically` is true, the outer box also centers
  vertically — used for short cinematic content (`VictoryScreen`,
  `EncounterVictoryScreen`). Default `false` keeps lists pinned to the
  top of the screen, where the eye expects them.
- No state, no effects, no key handling. Pure layout.

## 3. Width

Inner column = **64 characters**.

- Wider than the Menu's centered content (~59) so titles like
  `"Trait practice (sorted: needs-practice → strong)"` (49 chars) and
  any near-future hint lines don't crowd the column.
- Narrower than the existing 76-char terminal-width budget
  (enforced by `tests/screens/MenuScreen.test.ts`) so there is visual
  margin even on a minimum-width terminal.
- Stats rows from `renderStatsRowText` top out around 50 chars; story
  and tutorial select rows are short. 64 fits all current content with
  headroom.

The number is exported as a named constant `DEFAULT_SCREEN_WIDTH` from
`Screen.tsx` so screens that want to deviate (none today) can reference
it explicitly rather than guessing.

## 4. Migration

Each migrated screen replaces its outer `<box>` with `<Screen>` and
keeps its existing children unchanged. No screen-internal logic
changes.

| Screen | Wrap? | Notes |
|---|---|---|
| `StatsScreen` | yes | `centerVertically={false}`. |
| `StorySelectScreen` | yes | `centerVertically={false}`. |
| `TutorialSelectScreen` | yes | `centerVertically={false}`. |
| `EncounterIntroScreen` | yes | `centerVertically={false}`. |
| `EncounterVictoryScreen` | yes | `centerVertically={true}` — cinematic. |
| `VictoryScreen` | yes | `centerVertically={true}` — cinematic. |
| `MenuScreen` | no | Already centered with custom row composition. |
| `CombatScreen` (play) | no | Full-bleed sidebar+body layout. |
| `CombatScreen` (intro) | no | Tight cinematic block, kept as-is. |

The CombatScreen intro phase could migrate as a follow-up if the
visual ends up feeling out of place once the others are done; not part
of this iteration.

## 5. Tests

This codebase tests pure helpers extracted from components, not
rendered React trees (see `tests/components/HpBar.test.ts`,
`tests/screens/StatsScreen.test.ts`, etc.). The `Screen` component
follows the same pattern.

### `tests/components/Screen.test.ts` (new)

Extract the only piece of logic — the conditional outer-box props —
into a pure helper:

```ts
export function screenOuterBoxProps(centerVertically: boolean) {
  return {
    flexDirection: "column" as const,
    flexGrow: 1,
    padding: 2,
    alignItems: "center" as const,
    ...(centerVertically ? { justifyContent: "center" as const } : {}),
  };
}
```

Tests:

- Default (`centerVertically=false`) returns the four base props with
  no `justifyContent` key.
- `centerVertically=true` adds `justifyContent: "center"`.

The JSX wrapping in `Screen` itself is a one-liner around this helper
plus the inner-box `width` prop — type-checking covers the rest. No
render-tree assertions.

### Per-migrated-screen tests

The existing screen tests already cover screen-internal behavior
(e.g. `StatsScreen` tests `renderStatsRowText`). The migration changes
only the outer wrapper, not those internals, so existing tests stay
green and no new per-screen tests are added.

The drift guard against accidental unwrapping is human review +
manual `bun run dev` verification, not a test. The wrapper is too
shallow for a test to add value beyond what type-checking already
provides.

## 6. Module structure

- `src/components/Screen.tsx` — single file, single export plus the
  `DEFAULT_SCREEN_WIDTH` constant. ~30 lines.
- Six screen files lose their outer-box layout and import `Screen`.
  Each diff is a few lines.
- No new directories. No barrel files.

### What is intentionally not abstracted

- No `<ScreenTitle>` slot. Screens that want a title just render a
  `<text>` first; current screens do exactly this (`STATS  ([esc] back)`,
  `Choose your fight  ([esc] back)`).
- No `<ScreenFooter>` slot. Same rationale.
- No theming hooks. Padding, alignment, and width are positional
  contracts; visual styling stays per-screen.
- No "auto width from content" mode. The whole point is a *stable*
  column.

## 7. Out of scope

- Status-bar / nav-bar chrome (option B from brainstorming).
- Migration of Menu or Combat screens.
- Visual restyling, color, or new typography.
- Centralized hotkey / hint declaration.
- Hot-reload-safe layout (the existing screens already work fine).
