# Screen Layout Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared `<Screen>` wrapper component that gives every text-list screen a consistent centered max-width column, replacing the divergent top-left vs. centered styling currently scattered across screens.

**Architecture:** New `src/components/Screen.tsx` exports a thin layout primitive plus a pure `screenOuterBoxProps` helper. Six existing screens swap their outer `<box>` for `<Screen>`. Screens that previously used `gap={1}` between children wrap their content in an inner `<box flexDirection="column" gap={1}>` to preserve the gap, since `Screen` itself is purely positional and has no `gap` prop.

**Tech Stack:** TypeScript, React, `@gridland/utils` TUI primitives, Bun test runner.

**Spec:** `docs/superpowers/specs/2026-05-06-screen-layout-component-design.md`

---

## File Structure

- **Create**: `src/components/Screen.tsx` — `Screen` component + `screenOuterBoxProps` pure helper + `DEFAULT_SCREEN_WIDTH` constant. ~30 lines.
- **Create**: `tests/components/Screen.test.ts` — tests the pure helper.
- **Modify**: `src/screens/StatsScreen.tsx` — wrap with `<Screen>` (no gap).
- **Modify**: `src/screens/StorySelectScreen.tsx` — wrap with `<Screen>` (no gap).
- **Modify**: `src/screens/TutorialSelectScreen.tsx` — wrap with `<Screen>` (no gap).
- **Modify**: `src/screens/EncounterIntroScreen.tsx` — wrap with `<Screen>`, preserve `gap={1}` via inner box.
- **Modify**: `src/screens/EncounterVictoryScreen.tsx` — wrap with `<Screen centerVertically>`, preserve `gap={1}`.
- **Modify**: `src/screens/VictoryScreen.tsx` — wrap with `<Screen centerVertically>`, preserve `gap={1}`.

No other files touched. No new directories.

---

## Task 1: Create the `Screen` component

Adds the layout primitive plus the pure helper that owns the conditional `justifyContent` prop. Tests the helper, since the codebase's pattern is to test extracted pure functions and never render React in tests (see `tests/components/HpBar.test.ts`, `tests/screens/StatsScreen.test.ts`).

**Files:**
- Create: `src/components/Screen.tsx`
- Create: `tests/components/Screen.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/Screen.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { screenOuterBoxProps, DEFAULT_SCREEN_WIDTH } from "@/components/Screen";

describe("screenOuterBoxProps", () => {
  test("default props omit justifyContent", () => {
    expect(screenOuterBoxProps(false)).toEqual({
      flexDirection: "column",
      flexGrow: 1,
      padding: 2,
      alignItems: "center",
    });
  });

  test("centerVertically=true adds justifyContent", () => {
    expect(screenOuterBoxProps(true)).toEqual({
      flexDirection: "column",
      flexGrow: 1,
      padding: 2,
      alignItems: "center",
      justifyContent: "center",
    });
  });
});

describe("DEFAULT_SCREEN_WIDTH", () => {
  test("is 64 characters", () => {
    expect(DEFAULT_SCREEN_WIDTH).toBe(64);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `bun test tests/components/Screen.test.ts`
Expected: FAIL — `Cannot find module '@/components/Screen'` or similar import error.

- [ ] **Step 3: Implement the component**

Create `src/components/Screen.tsx`:

```tsx
import React from "react";

/** Default inner column width for screens, in characters. */
export const DEFAULT_SCREEN_WIDTH = 64;

/**
 * Pure prop builder for the outer box of `Screen`. Extracted so the
 * conditional-prop logic can be unit-tested without rendering.
 */
export function screenOuterBoxProps(centerVertically: boolean) {
  const base = {
    flexDirection: "column" as const,
    flexGrow: 1,
    padding: 2,
    alignItems: "center" as const,
  };
  return centerVertically
    ? { ...base, justifyContent: "center" as const }
    : base;
}

export type ScreenProps = {
  children: React.ReactNode;
  /** Inner column width in characters. Default `DEFAULT_SCREEN_WIDTH` (64). */
  width?: number;
  /** Centers content vertically as well as horizontally. Default false. */
  centerVertically?: boolean;
};

export function Screen({
  children,
  width = DEFAULT_SCREEN_WIDTH,
  centerVertically = false,
}: ScreenProps): React.ReactElement {
  return (
    <box {...screenOuterBoxProps(centerVertically)}>
      <box flexDirection="column" width={width}>
        {children}
      </box>
    </box>
  );
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `bun test tests/components/Screen.test.ts`
Expected: PASS — three tests, all green.

- [ ] **Step 5: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Screen.tsx tests/components/Screen.test.ts
git commit -m "feat(layout): add Screen wrapper component"
```

---

## Task 2: Migrate top-aligned list screens

Wraps `StatsScreen`, `StorySelectScreen`, and `TutorialSelectScreen` with `<Screen>`. All three currently use `padding={1} gap={0}`, so no inner gap-preserving box is needed — the children are already tightly stacked. The migration is a one-liner in each: change the outer `<box flexDirection="column" padding={1} gap={0}>` to `<Screen>` and the closing `</box>` to `</Screen>`.

**Files:**
- Modify: `src/screens/StatsScreen.tsx:46`
- Modify: `src/screens/StorySelectScreen.tsx:54`
- Modify: `src/screens/TutorialSelectScreen.tsx:26`

- [ ] **Step 1: Migrate `StatsScreen`**

In `src/screens/StatsScreen.tsx`, add to the imports at the top:

```ts
import { Screen } from "@/components/Screen";
```

Then change the return statement from:

```tsx
  return (
    <box flexDirection="column" padding={1} gap={0}>
      <text>STATS  ([esc] back)</text>
```

to:

```tsx
  return (
    <Screen>
      <text>STATS  ([esc] back)</text>
```

And change the matching closing `</box>` (line 61 currently) to `</Screen>`.

- [ ] **Step 2: Migrate `StorySelectScreen`**

In `src/screens/StorySelectScreen.tsx`, add the import:

```ts
import { Screen } from "@/components/Screen";
```

Change the return from:

```tsx
  return (
    <box flexDirection="column" padding={1} gap={0}>
      <text>Choose your fight  ([esc] back)</text>
```

to:

```tsx
  return (
    <Screen>
      <text>Choose your fight  ([esc] back)</text>
```

And change the matching closing `</box>` (line 80 currently) to `</Screen>`.

- [ ] **Step 3: Migrate `TutorialSelectScreen`**

In `src/screens/TutorialSelectScreen.tsx`, add the import:

```ts
import { Screen } from "@/components/Screen";
```

Change the return from:

```tsx
  return (
    <box flexDirection="column" padding={1} gap={0}>
      <text>Tutorial — pick a teacher  ([esc] back)</text>
```

to:

```tsx
  return (
    <Screen>
      <text>Tutorial — pick a teacher  ([esc] back)</text>
```

And change the matching closing `</box>` (line 34 currently) to `</Screen>`.

- [ ] **Step 4: Run the test suite**

Run: `bun test`
Expected: all existing tests pass; no behavior tests for these three screens are touched.

- [ ] **Step 5: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/screens/StatsScreen.tsx src/screens/StorySelectScreen.tsx src/screens/TutorialSelectScreen.tsx
git commit -m "refactor(screens): wrap list screens with Screen layout"
```

---

## Task 3: Migrate `EncounterIntroScreen`

This screen used `gap={1}` to space its lines. Since `Screen` is positional-only, preserve the gap by wrapping content in an inner `<box flexDirection="column" gap={1}>`.

**Files:**
- Modify: `src/screens/EncounterIntroScreen.tsx`

- [ ] **Step 1: Migrate the screen**

In `src/screens/EncounterIntroScreen.tsx`, add to the top imports:

```ts
import { Screen } from "@/components/Screen";
```

Replace the entire return body. From:

```tsx
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
```

to:

```tsx
  return (
    <Screen>
      <box flexDirection="column" gap={1}>
        <text>WILD ENCOUNTER MODE</text>
        <text>───────────────────</text>
        <text>Random monsters from the wild + story pools.</text>
        <text>Slay one and the next appears immediately.</text>
        <text>[esc] flees back to main menu.</text>
        <text> </text>
        <text>[⏎] begin     [esc] back</text>
      </box>
    </Screen>
  );
```

- [ ] **Step 2: Run the test suite**

Run: `bun test`
Expected: all tests pass.

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/EncounterIntroScreen.tsx
git commit -m "refactor(screens): wrap EncounterIntro with Screen layout"
```

---

## Task 4: Migrate cinematic screens (`EncounterVictoryScreen`, `VictoryScreen`)

Both use `padding={2} gap={1} alignItems="center"` today and present short cinematic content (a few lines max). They get `<Screen centerVertically>` so the content sits in the vertical middle of the terminal. Both preserve the `gap={1}` via an inner column box.

**Files:**
- Modify: `src/screens/EncounterVictoryScreen.tsx`
- Modify: `src/screens/VictoryScreen.tsx`

- [ ] **Step 1: Migrate `EncounterVictoryScreen`**

In `src/screens/EncounterVictoryScreen.tsx`, add to the imports:

```ts
import { Screen } from "@/components/Screen";
```

Replace the return body. From:

```tsx
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
```

to:

```tsx
  return (
    <Screen centerVertically>
      <box flexDirection="column" gap={1} alignItems="center">
        <text>SLAIN</text>
        <text>{monsterName}</text>
        <text>───────────────</text>
        <text>Encounter #{sessionNumber} · kill {killNumberInSession} of this session</text>
        <text> </text>
        <text>any key advances · [esc] main menu</text>
      </box>
    </Screen>
  );
```

The inner `alignItems="center"` keeps the cinematic text centered within the 64-wide column. The outer `Screen centerVertically` centers that column on the terminal.

- [ ] **Step 2: Migrate `VictoryScreen`**

In `src/screens/VictoryScreen.tsx`, add to the imports:

```ts
import { Screen } from "@/components/Screen";
```

Replace the return body. From:

```tsx
  return (
    <box flexDirection="column" padding={2} gap={1} alignItems="center">
      <text>VICTORY</text>
      <text>{monsterName} has fallen.</text>
      <text>───────────────</text>
      <text>press ⏎ to continue</text>
    </box>
  );
```

to:

```tsx
  return (
    <Screen centerVertically>
      <box flexDirection="column" gap={1} alignItems="center">
        <text>VICTORY</text>
        <text>{monsterName} has fallen.</text>
        <text>───────────────</text>
        <text>press ⏎ to continue</text>
      </box>
    </Screen>
  );
```

- [ ] **Step 3: Run the test suite**

Run: `bun test`
Expected: all tests pass.

- [ ] **Step 4: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/EncounterVictoryScreen.tsx src/screens/VictoryScreen.tsx
git commit -m "refactor(screens): wrap cinematic screens with centered Screen"
```

---

## Task 5: Manual verification

Layout changes are visual; the test suite alone can't confirm them. Run the dev server and verify each migrated screen renders correctly.

**Files:** none (verification only).

- [ ] **Step 1: Run the validator and full test suite**

Run: `bun run validate-content && bun test`
Expected: validator clean, all tests pass.

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Start the dev runner**

Run: `bun run dev`
Expected: app boots into the menu.

- [ ] **Step 4: Verify each migrated screen visually**

For each screen, navigate to it and confirm:
- Content sits in a centered column (~64 chars wide), not at the top-left of the terminal.
- Spacing between lines matches the previous behavior (no double-padding, no missing gaps).
- Text is readable on an 80-column terminal.

Screens to check (by menu path):
- **Stats** — Menu → Stats. Expect centered column with the trait practice list inside.
- **Story select** — Menu → Story. Expect chapter list centered.
- **Tutorial select** — Menu → Tutorial. Expect teacher list centered.
- **Encounter intro** — Menu → Encounter. Expect intro text centered horizontally.
- **Encounter victory** — Menu → Encounter → kill a monster. Expect "SLAIN" cinematic centered both horizontally and vertically.
- **Victory** — Menu → Story → finish a chapter monster. Expect "VICTORY" centered both ways.

- [ ] **Step 5: Verify Menu and Combat are unaffected**

Navigate to the Menu and confirm it renders identically to before (the trophy-wall layout from the prior iteration). Start a combat and confirm the play screen still uses its full-bleed sidebar+body layout.

- [ ] **Step 6: Verify width on a narrow terminal**

Resize the terminal to 80 columns. Migrated screens should not wrap or clip; the 64-char column has 16 chars of margin (8 per side via the parent flex centering plus padding).

- [ ] **Step 7: No commit**

Nothing to commit unless verification surfaced a fix; in that case, commit the fix in this step.

---

## Self-Review Checklist (for the engineer running this plan)

Before marking the plan complete, confirm:

- [ ] Every migrated screen wraps its content in `<Screen>`.
- [ ] Cinematic screens (EncounterVictory, Victory) use `centerVertically`.
- [ ] Screens that had `gap={1}` retain visual gap via an inner box.
- [ ] No screen has both its old outer-box layout props and the new `<Screen>` wrapper (no double-padding).
- [ ] Menu and Combat (play phase) are untouched.
- [ ] `bun test`, `bunx tsc --noEmit`, and `bun run validate-content` all pass.
- [ ] Visual verification done in `bun run dev`.
