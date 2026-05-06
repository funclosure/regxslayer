# Screen Chrome Rethink Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent top chrome bar and standardize a top-anchored screen structure so every non-Menu screen feels like the same frame, eliminating the eye-jumping caused by the previous centerVertically attempt.

**Architecture:** New `<ChromeBar hints={...} />` component renders a 1-row dashed strip at the top with the `regxslayer` brand on the left and screen-supplied hints on the right. The existing `<Screen>` component is rewritten to wrap its children with the chrome bar above and a `flexGrow={1}` inner column that absorbs vertical slack. The `centerVertically` prop is removed entirely. Each migrated screen restructures content as title → top-anchored content → optional `flexGrow={1}` slack absorber → footer hint. Long lists swap the bare slack absorber for `<scrollbox flexGrow={1}>`. Pattern adapted from `pace/src/ui/App.tsx`.

**Tech Stack:** TypeScript, React, `@gridland/utils` (`useTerminalDimensions` hook), Bun test runner.

**Spec:** `docs/superpowers/specs/2026-05-06-screen-chrome-rethink-design.md`

---

## File Structure

- **Create**: `src/components/ChromeBar.tsx` — `<ChromeBar>` component + `formatChromeRow(brand, hints, width)` pure helper. ~35 lines.
- **Create**: `tests/components/ChromeBar.test.ts` — tests for `formatChromeRow`.
- **Modify**: `src/components/Screen.tsx` — rewrite to drop `centerVertically`, accept required `hints` prop, render `<ChromeBar>` at top, set `flexGrow={1}` on inner column.
- **Modify**: `tests/components/Screen.test.ts` — drop `screenOuterBoxProps` tests (helper removed); keep the `DEFAULT_SCREEN_WIDTH` constant test.
- **Modify**: `src/screens/StatsScreen.tsx` — restructure to scrollbox variant.
- **Modify**: `src/screens/StorySelectScreen.tsx` — restructure to scrollbox variant.
- **Modify**: `src/screens/TutorialSelectScreen.tsx` — restructure to bare slack-absorber variant.
- **Modify**: `src/screens/EncounterIntroScreen.tsx` — restructure to bare slack-absorber variant.
- **Modify**: `src/screens/VictoryScreen.tsx` — restructure to cinematic variant (left-aligned for cohesion).
- **Modify**: `src/screens/EncounterVictoryScreen.tsx` — restructure to cinematic variant.

No new directories. No barrel files.

---

## Task 1: Create `ChromeBar` component + `formatChromeRow` helper

The chrome bar is the visual anchor for every non-Menu screen. The pure helper `formatChromeRow` does the dash math; the JSX is a thin wrapper that calls `useTerminalDimensions` to get width and passes it to the helper.

**Files:**
- Create: `src/components/ChromeBar.tsx`
- Create: `tests/components/ChromeBar.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/ChromeBar.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { formatChromeRow, BRAND } from "@/components/ChromeBar";

describe("BRAND", () => {
  test("is regxslayer", () => {
    expect(BRAND).toBe("regxslayer");
  });
});

describe("formatChromeRow", () => {
  test("with hints, fills middle with dashes to width", () => {
    const row = formatChromeRow("regxslayer", "[esc] back", 80);
    expect([...row].length).toBe(80);
    expect(row.startsWith("─── regxslayer ")).toBe(true);
    expect(row.endsWith(" [esc] back ───")).toBe(true);
    // Middle is all dashes
    const middle = row.slice("─── regxslayer ".length, row.length - " [esc] back ───".length);
    expect([...middle].every((c) => c === "─")).toBe(true);
  });

  test("with empty hints, fills entire right side with dashes", () => {
    const row = formatChromeRow("regxslayer", "", 80);
    expect([...row].length).toBe(80);
    expect(row.startsWith("─── regxslayer ")).toBe(true);
    const tail = row.slice("─── regxslayer ".length);
    expect([...tail].every((c) => c === "─")).toBe(true);
  });

  test("narrow terminal below brand+hints+12 falls back to empty-hints form", () => {
    // brand=10, hints=21, threshold = 43. width=30 falls back.
    const row = formatChromeRow("regxslayer", "[esc] back · [?] help", 30);
    expect([...row].length).toBe(30);
    expect(row.startsWith("─── regxslayer ")).toBe(true);
    // No hints in output
    expect(row).not.toContain("[esc]");
    const tail = row.slice("─── regxslayer ".length);
    expect([...tail].every((c) => c === "─")).toBe(true);
  });

  test("at exactly the threshold width, hints fit", () => {
    // brand=10, hints=10, threshold = 32. width=32 fits.
    const row = formatChromeRow("regxslayer", "[esc] back", 32);
    expect([...row].length).toBe(32);
    expect(row).toContain("[esc] back");
    expect(row.endsWith(" [esc] back ───")).toBe(true);
  });

  test("one below threshold drops hints", () => {
    const row = formatChromeRow("regxslayer", "[esc] back", 31);
    expect([...row].length).toBe(31);
    expect(row).not.toContain("[esc]");
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `bun test tests/components/ChromeBar.test.ts`
Expected: FAIL — `Cannot find module '@/components/ChromeBar'`.

- [ ] **Step 3: Implement the component and helper**

Create `src/components/ChromeBar.tsx`:

```tsx
import React from "react";
import { useTerminalDimensions } from "@gridland/utils";

export const BRAND = "regxslayer";

const DASH_PADDING = 3;
const SPACE_PADDING = 4; // 2 spaces around brand + 2 spaces around hints

/**
 * Pure builder for the chrome row text. Falls back to empty-hints form
 * (brand + dashes only) when the terminal is too narrow to fit
 * `brand + hints + 12` chars.
 */
export function formatChromeRow(brand: string, hints: string, width: number): string {
  const minForHints = brand.length + hints.length + 2 * DASH_PADDING + SPACE_PADDING;
  const leftSegment = `${"─".repeat(DASH_PADDING)} ${brand} `;
  if (hints === "" || width < minForHints) {
    const filling = "─".repeat(Math.max(0, width - leftSegment.length));
    return leftSegment + filling;
  }
  const rightSegment = ` ${hints} ${"─".repeat(DASH_PADDING)}`;
  const middleDashes = "─".repeat(width - leftSegment.length - rightSegment.length);
  return leftSegment + middleDashes + rightSegment;
}

export type ChromeBarProps = {
  /** Right-aligned hint text, e.g. "[esc] back · [?] help". */
  hints: string;
};

export function ChromeBar({ hints }: ChromeBarProps): React.ReactElement {
  const { width } = useTerminalDimensions();
  return (
    <box>
      <text>{formatChromeRow(BRAND, hints, width)}</text>
    </box>
  );
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `bun test tests/components/ChromeBar.test.ts`
Expected: PASS — all five tests green.

- [ ] **Step 5: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChromeBar.tsx tests/components/ChromeBar.test.ts
git commit -m "feat(layout): add ChromeBar component with persistent brand + hints"
```

---

## Task 2: Rewrite `Screen` component + update tests

`Screen` is reshaped: drop `centerVertically`, require `hints`, render `ChromeBar` at top, set `flexGrow={1}` on inner column. The pure helper `screenOuterBoxProps` is no longer needed (no conditional logic remains) — drop it.

**Files:**
- Modify: `src/components/Screen.tsx` (full rewrite)
- Modify: `tests/components/Screen.test.ts` (drop `screenOuterBoxProps` tests; keep `DEFAULT_SCREEN_WIDTH`)

- [ ] **Step 1: Rewrite the test file first**

Replace the entire contents of `tests/components/Screen.test.ts` with:

```ts
import { describe, expect, test } from "bun:test";
import { DEFAULT_SCREEN_WIDTH } from "@/components/Screen";

describe("DEFAULT_SCREEN_WIDTH", () => {
  test("is 64 characters", () => {
    expect(DEFAULT_SCREEN_WIDTH).toBe(64);
  });
});
```

The previous tests for `screenOuterBoxProps(centerVertically)` are removed because the helper is gone — there is no remaining conditional logic in `Screen`'s outer box, so no testable seam.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `bun test tests/components/Screen.test.ts`
Expected: PASS for `DEFAULT_SCREEN_WIDTH`. The old tests are gone, so no failures. Then in the next step, the `Screen` component's old code (with `screenOuterBoxProps` and `centerVertically`) still exists and may break in the screen migrations later, but this test file is already aligned with the new design.

(Skip the "verify it fails" idea here — the test was already passing because we kept the constant. The TDD cycle in this task is on the component rewrite, exercised through the ChromeBar tests in Task 1 and the screen migrations in later tasks.)

- [ ] **Step 3: Rewrite `Screen.tsx`**

Replace the entire contents of `src/components/Screen.tsx` with:

```tsx
import React from "react";
import { ChromeBar } from "@/components/ChromeBar";

/** Default inner column width for screens, in characters. */
export const DEFAULT_SCREEN_WIDTH = 64;

export type ScreenProps = {
  children: React.ReactNode;
  /** Right-aligned chrome hint, e.g. "[esc] back · [?] help". */
  hints: string;
  /** Inner column width in characters. Default `DEFAULT_SCREEN_WIDTH` (64). */
  width?: number;
};

/**
 * Standard screen frame: chrome bar on top + a centered, fixed-width
 * inner column that fills the remaining height. Children control where
 * vertical slack is absorbed (use `<box flexGrow={1} />` for an empty
 * gap or `<scrollbox flexGrow={1}>` to scroll long content).
 */
export function Screen({
  children,
  hints,
  width = DEFAULT_SCREEN_WIDTH,
}: ScreenProps): React.ReactElement {
  return (
    <box flexDirection="column" flexGrow={1} width="100%">
      <ChromeBar hints={hints} />
      <box flexDirection="column" flexGrow={1} alignItems="center" padding={2}>
        <box flexDirection="column" width={width} flexGrow={1} gap={1}>
          {children}
        </box>
      </box>
    </box>
  );
}
```

Notes:
- `centerVertically` prop is gone.
- `screenOuterBoxProps` helper is gone.
- `hints` is required (no default) — every Screen consumer must pick a hint string.
- Inner column has `flexGrow={1}` so it fills the content area vertically.
- Inner column has `gap={1}` for default 1-row spacing between top-level children. Screens that want zero gap wrap dense rows in their own `<box flexDirection="column" gap={0}>`.

- [ ] **Step 4: Run tests + type-check**

Run: `bun test tests/components/Screen.test.ts && bunx tsc --noEmit`
Expected: `Screen.test.ts` passes (1 test). `tsc` likely FAILS now because the six screen files still pass `<Screen>` without `hints`, or pass `centerVertically` which no longer exists. **This is expected** — the screens get migrated in Tasks 3 and 4. Continue to Task 3 directly; do not commit Task 2 alone.

- [ ] **Step 5: Do NOT commit yet**

Task 2 leaves the build broken until Tasks 3 and 4 land. Combine the commits at the end of Task 4. Skip the commit step here.

---

## Task 3: Migrate 4 list screens

Restructure `StatsScreen`, `StorySelectScreen`, `TutorialSelectScreen`, `EncounterIntroScreen`. All four follow the spec §3 pattern: title → content → optional slack-absorber/scrollbox → optional footer. Each pulls a hint string into the chrome bar.

**Files:**
- Modify: `src/gridland-augment.d.ts` — declare `scrollbox` so the JSX type-checks.
- Modify: `src/screens/StatsScreen.tsx`
- Modify: `src/screens/StorySelectScreen.tsx`
- Modify: `src/screens/TutorialSelectScreen.tsx`
- Modify: `src/screens/EncounterIntroScreen.tsx`

- [ ] **Step 0: Augment TypeScript for `<scrollbox>`**

Stats and StorySelect use `<scrollbox>`, which is a runtime intrinsic in `@gridland/bun` but not declared in the project's JSX augment. Without this step, the migrated screens won't type-check.

In `src/gridland-augment.d.ts`, change:

```ts
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      box: any;
      text: any;
      span: any;
    }
  }
}
```

to:

```ts
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      box: any;
      text: any;
      span: any;
      scrollbox: any;
    }
  }
}
```

- [ ] **Step 1: Migrate `StatsScreen`**

In `src/screens/StatsScreen.tsx`, replace the JSX returned by the component (the `return (...)` block — currently lines 46–62) with:

```tsx
  return (
    <Screen hints="[r] reset · [esc] back">
      <box flexDirection="column" gap={0}>
        <text>STATS  ([esc] back)</text>
        <text>───────────────────</text>
        <text>Lifetime: {total} monsters slain (story {save.storyKills} · encounter {save.encounterKills})</text>
        <text>Sessions: {save.encounterSessions} encounter runs</text>
      </box>
      <box flexDirection="column" gap={0}>
        <text>Trait practice (sorted: needs-practice → strong)</text>
        <text>─────────────────────────────────────────────────</text>
      </box>
      <scrollbox flexGrow={1}>
        {rows.map((r) => (
          <text key={r.trait}>{renderStatsRowText(r.trait, r.stat)}</text>
        ))}
      </scrollbox>
      {confirming
        ? <text>Reset all trait stats? This cannot be undone. [y]es / [n]o (default)</text>
        : <text>[r] reset stats     [esc] back</text>}
    </Screen>
  );
```

The previous outer `<Screen>` (or `<Screen centerVertically>` if Task 2 of the prior iteration's commit `7529a8a` is still in place) is fully replaced. The previous wrapping `<box flexDirection="column" padding={1} gap={0}>` from before that — already removed in commit `140eec4` — is also gone.

The `Screen` import line stays at the top of the file (added in `140eec4`); no import change needed.

- [ ] **Step 2: Migrate `StorySelectScreen`**

In `src/screens/StorySelectScreen.tsx`, replace the JSX returned by the component with:

```tsx
  return (
    <Screen hints="[↑↓] move · [⏎] enter · [esc] back">
      <box flexDirection="column" gap={0}>
        <text>Choose your fight  ([esc] back)</text>
        <text>──────────────────────────────</text>
      </box>
      <scrollbox flexGrow={1}>
        {chapters.map((c, ci) => {
          const unlocked = isChapterUnlocked(save, chapters, ci);
          const total = c.monsters.length;
          const slain = c.monsters.filter((m) => isSlain(save, c.id, m.id)).length;
          const head = unlocked
            ? `${c.title} — ${slain}/${total} slain`
            : `${c.title} (locked)`;
          return (
            <box flexDirection="column" key={c.id}>
              <text>{head}</text>
              {unlocked
                ? c.monsters.map((m) => {
                    const e = entries.findIndex((x) => x.chapter.id === c.id && x.monster.id === m.id);
                    const cur = e === idx;
                    const mark = isSlain(save, c.id, m.id) ? "✓" : "·";
                    return (
                      <text key={m.id}>{cur ? "▶ " : "  "}{mark} {m.name}</text>
                    );
                  })
                : null}
            </box>
          );
        })}
      </scrollbox>
    </Screen>
  );
```

The chapter rendering loop is unchanged — only the outer wrapper and the scrollbox around the chapters map are new.

- [ ] **Step 3: Migrate `TutorialSelectScreen`**

In `src/screens/TutorialSelectScreen.tsx`, replace the JSX returned by the component with:

```tsx
  return (
    <Screen hints="[↑↓] move · [⏎] start · [esc] back">
      <box flexDirection="column" gap={0}>
        <text>Tutorial — pick a teacher  ([esc] back)</text>
        <text>──────────────────────────────────────</text>
        {monsters.map((m, i) => (
          <text key={m.id}>{i === idx ? "▶ " : "  "}{m.name}</text>
        ))}
      </box>
      <text>(tutorials are replayable; they don't track progress or feed stats)</text>
      <box flexGrow={1} />
    </Screen>
  );
```

The footnote sits below the list with one default gap row above it (from Screen's `gap={1}`); the bare `<box flexGrow={1} />` absorbs the rest of the vertical slack so the footnote stays near the top instead of drifting toward the bottom — this matches the cohesion principle (content top-anchored, slack at the bottom).

- [ ] **Step 4: Migrate `EncounterIntroScreen`**

In `src/screens/EncounterIntroScreen.tsx`, replace the JSX returned by the component with:

```tsx
  return (
    <Screen hints="[⏎] begin · [esc] back">
      <box flexDirection="column" gap={0}>
        <text>WILD ENCOUNTER MODE</text>
        <text>───────────────────</text>
      </box>
      <text>Random monsters from the wild + story pools.</text>
      <text>Slay one and the next appears immediately.</text>
      <text>[esc] flees back to main menu.</text>
      <box flexGrow={1} />
      <text>[⏎] begin     [esc] back</text>
    </Screen>
  );
```

The previous inner `<box flexDirection="column" gap={1}>` wrapper added in commit `f6f13fc` is removed — Screen now provides the gap default.

- [ ] **Step 5: Run tests + type-check**

Run: `bun test && bunx tsc --noEmit`
Expected: tests pass (existing screen-internal tests like `renderStatsRowText` are unaffected by the wrapper change). `tsc` should now be clean since all 4 list screens compile against the new `Screen` API. Cinematic screens (Victory, EncounterVictory) are still on the old Screen API — Task 4 fixes those.

If `tsc` complains about Victory/EncounterVictory specifically, that's expected. Continue to Task 4.

- [ ] **Step 6: Do NOT commit yet**

Combined commit at the end of Task 4.

---

## Task 4: Migrate cinematic screens (Victory, EncounterVictory)

Both screens lose `centerVertically` and `alignItems="center"`. Content sits left-aligned in the column, top-anchored below the chrome — same cohesion treatment as the list screens. The "vertically-centered stage moment" is given up; the chrome bar at the top is the new visual anchor.

**Files:**
- Modify: `src/screens/VictoryScreen.tsx`
- Modify: `src/screens/EncounterVictoryScreen.tsx`

- [ ] **Step 1: Migrate `VictoryScreen`**

In `src/screens/VictoryScreen.tsx`, replace the JSX returned by the component with:

```tsx
  return (
    <Screen hints="[⏎] continue">
      <box flexDirection="column" gap={0}>
        <text>VICTORY</text>
        <text>───────────────</text>
      </box>
      <text>{monsterName} has fallen.</text>
      <box flexGrow={1} />
      <text>press ⏎ to continue</text>
    </Screen>
  );
```

`alignItems="center"` and `centerVertically` are both gone.

- [ ] **Step 2: Migrate `EncounterVictoryScreen`**

In `src/screens/EncounterVictoryScreen.tsx`, replace the JSX returned by the component with:

```tsx
  return (
    <Screen hints="any key advances · [esc] menu">
      <box flexDirection="column" gap={0}>
        <text>SLAIN</text>
        <text>───────────────</text>
      </box>
      <text>{monsterName}</text>
      <text>Encounter #{sessionNumber} · kill {killNumberInSession} of this session</text>
      <box flexGrow={1} />
      <text>any key advances · [esc] main menu</text>
    </Screen>
  );
```

Same shape as VictoryScreen.

- [ ] **Step 3: Run the full test suite and type-check**

Run: `bun test && bunx tsc --noEmit && bun run validate-content`
Expected: 247+ tests pass (5 ChromeBar tests are new; old `screenOuterBoxProps` tests are gone — net +3 vs the pre-iteration baseline). `tsc` clean. Validator clean.

- [ ] **Step 4: Combined commit covering Tasks 2, 3, and 4**

```bash
git add src/components/Screen.tsx tests/components/Screen.test.ts \
        src/gridland-augment.d.ts \
        src/screens/StatsScreen.tsx src/screens/StorySelectScreen.tsx \
        src/screens/TutorialSelectScreen.tsx src/screens/EncounterIntroScreen.tsx \
        src/screens/VictoryScreen.tsx src/screens/EncounterVictoryScreen.tsx
git commit -m "refactor(screens): adopt chrome bar + top-anchored cohesive layout"
```

This single commit lands the Screen rewrite + all six screen migrations atomically, since none of them work in isolation (Screen's API changed; the screens depend on the new API).

---

## Task 5: Manual verification

Layout changes are visual — only `bun run dev` confirms the result. The user has flagged the previous iteration's "jumping" feel; this verification specifically checks that.

**Files:** none (verification only).

- [ ] **Step 1: Re-run automated checks**

Run: `bun run validate-content && bun test && bunx tsc --noEmit`
Expected: validator clean, 247+ tests pass, `tsc` clean.

- [ ] **Step 2: Start the dev runner**

Run: `bun run dev`
Expected: app boots into the menu.

- [ ] **Step 3: Verify the chrome bar appears on every non-Menu screen**

Navigate to each screen and confirm:
- Top row shows `─── regxslayer ─...─ <hints> ───`.
- The hints string matches the screen's intent (e.g. `[r] reset · [esc] back` on Stats).
- The chrome row is identical width to the terminal — fills edge to edge.

Screens to check:
- Stats (Menu → Stats)
- Story select (Menu → Story)
- Tutorial select (Menu → Tutorial)
- Encounter intro (Menu → Encounter)
- Encounter victory (Menu → Encounter → kill a monster)
- Victory (Menu → Story → finish a chapter monster)

- [ ] **Step 4: Verify the eye-jumping problem is gone**

Navigate Menu → Stats → Story → Tutorial → Encounter → back to Menu in quick succession. Confirm:
- The chrome bar stays at the top — same visual anchor across navigations.
- The screen title (`STATS`, `Choose your fight`, etc.) appears at the same row across navigations (chrome row + 2 padding + content gap).
- No content "jumps" to a new vertical position when switching screens.

- [ ] **Step 5: Verify the Menu is unaffected**

Navigate to the Menu and confirm it still renders the trophy-wall layout with no chrome bar (its banner anchors visually).

- [ ] **Step 6: Verify Combat play is unaffected**

Start a combat and confirm the play screen still uses its full-bleed sidebar+body layout with no chrome bar at the top.

- [ ] **Step 7: Verify Stats does not clip on a short terminal**

Resize the terminal to ~30 rows. Navigate to Stats. The trait list should scroll within its scrollbox region — the chrome bar and the section above the scrollbox should remain visible. The footer hint should stay pinned to the bottom.

- [ ] **Step 8: No commit needed unless verification surfaced a fix**

If a fix is required, commit it here with a descriptive message.

---

## Self-Review Checklist (for the engineer running this plan)

Before marking the plan complete, confirm:

- [ ] `<ChromeBar>` renders on Stats, StorySelect, TutorialSelect, EncounterIntro, EncounterVictory, Victory — and NOT on Menu or Combat.
- [ ] The chrome bar's hint text matches the spec table for each screen.
- [ ] Screen titles render at the same row across navigations (no eye-jumping).
- [ ] Long lists (Stats, StorySelect) scroll inside their scrollbox without clipping the chrome.
- [ ] Cinematic screens (Victory, EncounterVictory) sit top-anchored — content immediately below the chrome, not vertically centered.
- [ ] No screen still uses `centerVertically` (the prop no longer exists).
- [ ] `bun test`, `bun run validate-content`, and `bunx tsc --noEmit` all pass.
- [ ] Visual verification done in `bun run dev`.
