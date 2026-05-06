# Claude Code-style Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip the persistent chrome from the top of every non-Menu screen to a two-line status block at the bottom (Claude Code-style), with a universal scrollbox so content fills the viewport from the top and adapts to small terminals.

**Architecture:** New `<StatusBar screen hints>` component renders two rows pinned to the bottom: an info row (`─── regxslayer · <screen> · <N> slain · <M> sessions ───`) plus a hints row. Lifetime stats come from a new `<SaveProvider>` context wrapping the route switch in `src/app.tsx` (avoids prop-drilling save through every Screen). The `<Screen>` component is rewritten to wrap children in a top-anchored `<scrollbox flexGrow={1}>`, expose an optional `footer` prop for content that must escape the scrollbox (StatsScreen's reset-confirm prompt), and pin the StatusBar at the bottom. `<ChromeBar>` is deleted.

**Tech Stack:** TypeScript, React, `@gridland/utils` (`useTerminalDimensions` hook), Bun test runner.

**Spec:** `docs/superpowers/specs/2026-05-06-claude-code-layout-design.md`

---

## File Structure

- **Create**: `src/components/StatusBar.tsx` — `<StatusBar>` + pure helpers `formatStatusInfoRow`, `formatStatusHintRow`. ~70 lines.
- **Create**: `src/components/SaveContext.tsx` — `<SaveProvider>` + `useSaveLifetime()` hook + pure helper `computeLifetime`. ~30 lines.
- **Create**: `tests/components/StatusBar.test.ts` — tests for both pure helpers (full row, narrow fallback at each cutoff, empty hints).
- **Create**: `tests/components/SaveContext.test.ts` — tests for `computeLifetime` against fixture saves.
- **Modify**: `src/components/Screen.tsx` — drop `ChromeBar` import, add `screen` and `footer` props, wrap children in `<scrollbox flexGrow={1}>`, pin `<StatusBar>` at bottom, drop default `gap={1}` on inner column.
- **Modify**: `tests/components/Screen.test.ts` — keep only the `DEFAULT_SCREEN_WIDTH` assertion (already the case after iteration 2; no change needed).
- **Modify**: `src/app.tsx` — collapse the eight per-route wrapper trees into a single `routeJsx` switch + one `<SaveProvider>` shell.
- **Modify**: `src/screens/StatsScreen.tsx` — drop local scrollbox; move the reset-confirm prompt into the new `footer` prop; add `screen="stats"`.
- **Modify**: `src/screens/StorySelectScreen.tsx` — drop local scrollbox; add `screen="story"`.
- **Modify**: `src/screens/TutorialSelectScreen.tsx` — drop slack absorber; add `screen="tutorial"`.
- **Modify**: `src/screens/EncounterIntroScreen.tsx` — drop slack absorber; add `screen="encounter"`.
- **Modify**: `src/screens/VictoryScreen.tsx` — drop slack absorber; add `screen="victory"`.
- **Modify**: `src/screens/EncounterVictoryScreen.tsx` — drop slack absorber; add `screen="victory"`.
- **Delete**: `src/components/ChromeBar.tsx`.
- **Delete**: `tests/components/ChromeBar.test.ts`.

No new directories. No barrel files.

---

## Task 1: Create `StatusBar` component + pure helpers

The status bar pins to the bottom of every non-Menu screen. Two pure helpers do the layout math; the JSX is a thin wrapper that calls `useTerminalDimensions()` and `useSaveLifetime()`.

**Files:**
- Create: `src/components/StatusBar.tsx`
- Create: `tests/components/StatusBar.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/StatusBar.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { formatStatusInfoRow, formatStatusHintRow, BRAND } from "@/components/StatusBar";

describe("BRAND", () => {
  test("is regxslayer", () => {
    expect(BRAND).toBe("regxslayer");
  });
});

describe("formatStatusInfoRow", () => {
  test("at terminal width 80, renders full row with all four segments", () => {
    const row = formatStatusInfoRow("regxslayer", "stats", 12, 3, 80);
    expect([...row].length).toBe(80);
    expect(row.startsWith("─── regxslayer · stats · 12 slain · 3 sessions ")).toBe(true);
    const tail = row.slice("─── regxslayer · stats · 12 slain · 3 sessions ".length);
    expect([...tail].every((c) => c === "─")).toBe(true);
  });

  test("drops sessions first when too narrow for the full row", () => {
    // brand=10, screen=5, slain="12 slain"=8, sessions="3 sessions"=10
    // Full segment: "regxslayer · stats · 12 slain · 3 sessions" = 42
    // Full row needs: 3 + 1 + 42 + 1 + 2 (min trailing) = 49
    // Without sessions: "regxslayer · stats · 12 slain" = 29 → needs 36
    // Pick a width between 36 and 48 → drops sessions only.
    const row = formatStatusInfoRow("regxslayer", "stats", 12, 3, 40);
    expect([...row].length).toBe(40);
    expect(row).toContain("12 slain");
    expect(row).not.toContain("sessions");
  });

  test("drops slain next when even narrower", () => {
    // Width 32: needs to drop both sessions and slain. Keep brand + screen.
    // "regxslayer · stats" = 18 → needs 18 + 6 = 24. width 32 ok.
    const row = formatStatusInfoRow("regxslayer", "stats", 12, 3, 32);
    expect([...row].length).toBe(32);
    expect(row).toContain("regxslayer · stats");
    expect(row).not.toContain("slain");
    expect(row).not.toContain("sessions");
  });

  test("drops screen label as last fallback before brand-only", () => {
    // Width 20: even "regxslayer · stats" (24 needed) doesn't fit → brand-only.
    // "regxslayer" = 10 → needs 10 + 6 = 16. width 20 ok.
    const row = formatStatusInfoRow("regxslayer", "stats", 12, 3, 20);
    expect([...row].length).toBe(20);
    expect(row.startsWith("─── regxslayer ")).toBe(true);
    expect(row).not.toContain("stats");
    const tail = row.slice("─── regxslayer ".length);
    expect([...tail].every((c) => c === "─")).toBe(true);
  });

  test("brand stays visible even at extreme narrow widths", () => {
    // width 14: brand-only needs 16, so floor to truncated brand.
    const row = formatStatusInfoRow("regxslayer", "stats", 12, 3, 14);
    expect([...row].length).toBe(14);
    expect(row).toContain("regxslayer");
  });

  test("supports zero counts", () => {
    const row = formatStatusInfoRow("regxslayer", "stats", 0, 0, 80);
    expect([...row].length).toBe(80);
    expect(row).toContain("0 slain");
    expect(row).toContain("0 sessions");
  });
});

describe("formatStatusHintRow", () => {
  test("non-empty hints are left-padded by 1 space and right-filled to width", () => {
    const row = formatStatusHintRow("[r] reset · [esc] back", 40);
    expect([...row].length).toBe(40);
    expect(row.startsWith(" [r] reset · [esc] back")).toBe(true);
    expect(row.slice(" [r] reset · [esc] back".length)).toBe(" ".repeat(40 - " [r] reset · [esc] back".length));
  });

  test("empty hints renders a row of width spaces", () => {
    const row = formatStatusHintRow("", 30);
    expect(row).toBe(" ".repeat(30));
  });

  test("hints longer than width are clipped to width", () => {
    const row = formatStatusHintRow("very long hint that does not fit", 10);
    expect([...row].length).toBe(10);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `bun test tests/components/StatusBar.test.ts`
Expected: FAIL — `Cannot find module '@/components/StatusBar'`.

- [ ] **Step 3: Implement the helpers and component**

Create `src/components/StatusBar.tsx`:

```tsx
import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { useSaveLifetime } from "@/components/SaveContext";

export const BRAND = "regxslayer";

const PREFIX_DASHES = 3;
const SIDE_SPACE = 1;
const MIN_TRAILING_DASHES = 2;

function tryInfoRow(parts: readonly string[], width: number): string | null {
  const content = parts.join(" · ");
  const left = `${"─".repeat(PREFIX_DASHES)}${" ".repeat(SIDE_SPACE)}${content}${" ".repeat(SIDE_SPACE)}`;
  if (left.length + MIN_TRAILING_DASHES > width) return null;
  return left + "─".repeat(width - left.length);
}

/**
 * Pure builder for the status info row. Drops segments right-to-left
 * (sessions → slain → screen) when the terminal can't fit the full row.
 * Brand stays visible at any width; below brand-only the brand is
 * truncated rather than disappearing.
 */
export function formatStatusInfoRow(
  brand: string,
  screen: string,
  slain: number,
  sessions: number,
  width: number,
): string {
  const slainPart = `${slain} slain`;
  const sessionsPart = `${sessions} sessions`;
  const candidates: string[][] = [
    [brand, screen, slainPart, sessionsPart],
    [brand, screen, slainPart],
    [brand, screen],
    [brand],
  ];
  for (const parts of candidates) {
    const row = tryInfoRow(parts, width);
    if (row !== null) return row;
  }
  return brand.slice(0, width);
}

/**
 * Pure builder for the status hint row. Always returns exactly `width`
 * characters so the status block height is constant (preserves vertical
 * rhythm).
 */
export function formatStatusHintRow(hints: string, width: number): string {
  if (hints === "") return " ".repeat(width);
  const padded = ` ${hints}`;
  if (padded.length >= width) return padded.slice(0, width);
  return padded + " ".repeat(width - padded.length);
}

export type StatusBarProps = {
  /** Short screen identifier shown after the brand, e.g. "stats". */
  screen: string;
  /** Hints line, e.g. "[r] reset · [esc] back". */
  hints: string;
};

export function StatusBar({ screen, hints }: StatusBarProps): React.ReactElement {
  const { width } = useTerminalDimensions();
  const { slain, sessions } = useSaveLifetime();
  return (
    <box flexDirection="column" width="100%">
      <text>{formatStatusInfoRow(BRAND, screen, slain, sessions, width)}</text>
      <text>{formatStatusHintRow(hints, width)}</text>
    </box>
  );
}
```

The component imports `useSaveLifetime` from `@/components/SaveContext`, which doesn't exist yet — Task 2 creates it. The tests in Step 1 don't render the component (only the pure helpers), so they pass without needing the context. `tsc` will fail on the import until Task 2 lands.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `bun test tests/components/StatusBar.test.ts`
Expected: PASS — all 9 tests green. (`tsc` is intentionally not run yet; Task 2 fixes the import.)

- [ ] **Step 5: Do NOT commit yet**

Combined commit at the end of Task 2 — the StatusBar component depends on `SaveContext` which Task 2 creates.

---

## Task 2: Create `SaveContext` + `computeLifetime` helper

Lifetime stats (`slain`, `sessions`) feed the status bar but aren't otherwise needed by half the screens. A small context provider plus a pure helper avoids prop-drilling.

**Files:**
- Create: `src/components/SaveContext.tsx`
- Create: `tests/components/SaveContext.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/SaveContext.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { computeLifetime } from "@/components/SaveContext";
import type { SaveFile } from "@/game/types";

function makeSave(overrides: Partial<SaveFile> = {}): SaveFile {
  return {
    version: 2,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    chapters: {},
    traitStats: {},
    encounterSessions: 0,
    encounterKills: 0,
    storyKills: 0,
    lastMode: null,
    ...overrides,
  };
}

describe("computeLifetime", () => {
  test("sums storyKills and encounterKills into slain", () => {
    const save = makeSave({ storyKills: 7, encounterKills: 5 });
    expect(computeLifetime(save).slain).toBe(12);
  });

  test("returns encounterSessions directly", () => {
    const save = makeSave({ encounterSessions: 4 });
    expect(computeLifetime(save).sessions).toBe(4);
  });

  test("handles a fresh save (all zeros)", () => {
    const save = makeSave();
    expect(computeLifetime(save)).toEqual({ slain: 0, sessions: 0 });
  });

  test("handles story-only progress (no encounter activity)", () => {
    const save = makeSave({ storyKills: 3 });
    expect(computeLifetime(save)).toEqual({ slain: 3, sessions: 0 });
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `bun test tests/components/SaveContext.test.ts`
Expected: FAIL — `Cannot find module '@/components/SaveContext'`.

- [ ] **Step 3: Implement the context, hook, and helper**

Create `src/components/SaveContext.tsx`:

```tsx
import React from "react";
import type { SaveFile } from "@/game/types";

const SaveContext = React.createContext<SaveFile | null>(null);

/**
 * Pure derivation of the lifetime numbers shown in the status bar.
 * Exported separately so tests can exercise it without a React tree.
 */
export function computeLifetime(save: SaveFile): { slain: number; sessions: number } {
  return {
    slain: save.storyKills + save.encounterKills,
    sessions: save.encounterSessions,
  };
}

export type SaveProviderProps = {
  save: SaveFile;
  children: React.ReactNode;
};

export function SaveProvider({ save, children }: SaveProviderProps): React.ReactElement {
  return <SaveContext.Provider value={save}>{children}</SaveContext.Provider>;
}

/**
 * Returns the lifetime numbers from the nearest `<SaveProvider>`. Throws
 * if no provider is mounted — the StatusBar relies on this and should
 * never render outside the app shell.
 */
export function useSaveLifetime(): { slain: number; sessions: number } {
  const save = React.useContext(SaveContext);
  if (save === null) {
    throw new Error("useSaveLifetime must be called inside <SaveProvider>");
  }
  return computeLifetime(save);
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `bun test tests/components/SaveContext.test.ts && bunx tsc --noEmit`
Expected: 4 tests PASS. `tsc` clean — both new files (SaveContext.tsx, StatusBar.tsx from Task 1) compile.

- [ ] **Step 5: Run the full test suite**

Run: `bun test`
Expected: all existing tests still pass + the new StatusBar (9) + SaveContext (4) tests. The iteration-2 `ChromeBar.test.ts` and `Screen.test.ts` are still in place and still pass; nothing broke yet.

- [ ] **Step 6: Commit Tasks 1 + 2**

```bash
git add src/components/StatusBar.tsx src/components/SaveContext.tsx \
        tests/components/StatusBar.test.ts tests/components/SaveContext.test.ts
git commit -m "feat(layout): add StatusBar component + SaveContext for lifetime stats"
```

---

## Task 3: Implementation spike — verify universal scrollbox runtime behavior

Before rewriting `Screen` to wrap every screen in a scrollbox, verify the gridland scrollbox renders cleanly in both regimes. Pace's reference uses `// @ts-nocheck` over its scrollbox usage — typings are loose, so we confirm runtime behavior on real screens before bulk migration.

**Files:** none committed (temporary edits, reverted after the spike).

- [ ] **Step 1: Spike the short-content case on `VictoryScreen`**

In `src/screens/VictoryScreen.tsx`, temporarily wrap the existing `<Screen hints="...">` body's children in a scrollbox without changing anything else. Replace the JSX returned by the component with:

```tsx
  return (
    <Screen hints="[⏎] continue">
      <scrollbox flexGrow={1}>
        <box flexDirection="column" gap={0}>
          <text>VICTORY</text>
          <text>───────</text>
        </box>
        <text>{monsterName} has fallen.</text>
      </scrollbox>
    </Screen>
  );
```

Run: `bun run dev`. Trigger a story victory (Menu → Story → finish a chapter monster).

Expected observations:
- The "VICTORY" title and "fallen." line render at the top of the chrome's content area.
- No scrollbar artifact, no extra padding row, no clipping above or below.
- Pressing `⏎` still continues to story select.

If runtime issues appear (e.g. content not visible, scrollbar always shown, rendering glitches), abort the universal-scrollbox approach and switch to the fallback documented in the spec §7 (per-screen `<box flexGrow={1} />` slack absorbers + local scrollboxes only on Stats and StorySelect). Document the issue in a note inline in the plan and continue with the fallback.

- [ ] **Step 2: Spike the overflow case on `StatsScreen`**

In `src/screens/StatsScreen.tsx`, temporarily replace the existing inner `<scrollbox flexGrow={1}>{rows.map(...)}</scrollbox>` with a non-scrolling `<box flexDirection="column">{rows.map(...)}</box>`, and wrap *the entire children content* in a single outer `<scrollbox flexGrow={1}>`:

```tsx
  return (
    <Screen hints="[r] reset · [esc] back">
      <scrollbox flexGrow={1}>
        <box flexDirection="column" gap={0}>
          <text>STATS</text>
          <text>─────</text>
          <text>Lifetime: {total} monsters slain (story {save.storyKills} · encounter {save.encounterKills})</text>
          <text>Sessions: {save.encounterSessions} encounter runs</text>
        </box>
        <box flexDirection="column" gap={0}>
          <text>Trait practice (sorted: needs-practice → strong)</text>
          <text>─────────────────────────────────────────────────</text>
        </box>
        <box flexDirection="column">
          {rows.map((r) => (
            <text key={r.trait}>{renderStatsRowText(r.trait, r.stat)}</text>
          ))}
        </box>
        {confirming
          ? <text>Reset all trait stats? This cannot be undone. [y]es / [n]o (default)</text>
          : null}
      </scrollbox>
    </Screen>
  );
```

Run `bun run dev`. Resize the terminal to ~24 rows. Navigate Menu → Stats.

Expected observations:
- Trait list overflows the visible area; the scrollbox absorbs it without pushing the chrome bar off-screen.
- Press `j`/`k` or arrow keys (depending on what gridland's scrollbox binds) and confirm scrolling works.
- Press `[r]` to enter the reset-confirm state. Note where the confirm prompt appears: at the *end of the scrolled content* (i.e. you may need to scroll down to see it). This confirms the `footer` prop is necessary in Task 4.

- [ ] **Step 3: Revert the spike edits**

Restore both files to their pre-spike state:

```bash
git checkout -- src/screens/VictoryScreen.tsx src/screens/StatsScreen.tsx
```

- [ ] **Step 4: Verify clean revert**

Run: `git status`
Expected: working tree clean (no modified files from this task).

No commit — the spike is exploratory; only its findings inform Task 4.

---

## Task 4: Rewrite `Screen.tsx`, migrate 6 screens, refactor `app.tsx`

This is the load-bearing change. Screen's API gains `screen` and `footer` props; six screens are updated to pass `screen` and (for Stats) `footer`; `app.tsx` collapses its eight per-route wrapper trees into one shell wrapped in `<SaveProvider>`. None of these work alone — combined commit.

**Files:**
- Modify: `src/components/Screen.tsx`
- Modify: `src/screens/StatsScreen.tsx`
- Modify: `src/screens/StorySelectScreen.tsx`
- Modify: `src/screens/TutorialSelectScreen.tsx`
- Modify: `src/screens/EncounterIntroScreen.tsx`
- Modify: `src/screens/VictoryScreen.tsx`
- Modify: `src/screens/EncounterVictoryScreen.tsx`
- Modify: `src/app.tsx`

- [ ] **Step 1: Rewrite `Screen.tsx`**

Replace the entire contents of `src/components/Screen.tsx` with:

```tsx
import React from "react";
import { StatusBar } from "@/components/StatusBar";

/** Default inner column width for screens, in characters. */
export const DEFAULT_SCREEN_WIDTH = 64;

export type ScreenProps = {
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

/**
 * Standard screen frame: scrollable top-anchored content + optional
 * pinned footer + persistent status bar at the bottom.
 */
export function Screen({
  children,
  hints,
  screen,
  footer,
  width = DEFAULT_SCREEN_WIDTH,
}: ScreenProps): React.ReactElement {
  return (
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
  );
}
```

Notes:
- `ChromeBar` import gone.
- `screen` prop required; `footer` optional.
- Inner column dropped `flexGrow={1}` and `gap={1}` (the scrollbox owns vertical sizing; `gap` was overriding screens that want tight rows).
- StatusBar pins to the bottom outside the scrollbox.

- [ ] **Step 2: Migrate `StatsScreen`**

In `src/screens/StatsScreen.tsx`, replace the JSX returned by the component (the `return (...)` block) with:

```tsx
  return (
    <Screen
      screen="stats"
      hints="[r] reset · [esc] back"
      footer={
        confirming
          ? <text>Reset all trait stats? This cannot be undone. [y]es / [n]o (default)</text>
          : null
      }
    >
      <box flexDirection="column" gap={0}>
        <text>STATS</text>
        <text>─────</text>
        <text>Lifetime: {total} monsters slain (story {save.storyKills} · encounter {save.encounterKills})</text>
        <text>Sessions: {save.encounterSessions} encounter runs</text>
      </box>
      <text> </text>
      <box flexDirection="column" gap={0}>
        <text>Trait practice (sorted: needs-practice → strong)</text>
        <text>─────────────────────────────────────────────────</text>
        {rows.map((r) => (
          <text key={r.trait}>{renderStatsRowText(r.trait, r.stat)}</text>
        ))}
      </box>
    </Screen>
  );
```

Changes from the iteration-2 version:
- Inner `<scrollbox flexGrow={1}>` removed — Screen's universal scrollbox handles overflow.
- `confirming` prompt moved into `footer` so it stays visible above the StatusBar regardless of scroll position.
- `<text> </text>` blank row gives visual breathing room between the lifetime block and the trait section (replaces the `gap={1}` that the inner column used to apply automatically).

- [ ] **Step 3: Migrate `StorySelectScreen`**

In `src/screens/StorySelectScreen.tsx`, replace the JSX returned by the component with:

```tsx
  return (
    <Screen screen="story" hints="[↑↓] move · [⏎] enter · [esc] back">
      <box flexDirection="column" gap={0}>
        <text>Choose your fight</text>
        <text>─────────────────</text>
      </box>
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
    </Screen>
  );
```

Changes:
- Local `<scrollbox flexGrow={1}>` removed (Screen's universal scrollbox replaces it).
- Chapter-by-chapter iteration moved to be direct children of `<Screen>`.

- [ ] **Step 4: Migrate `TutorialSelectScreen`**

In `src/screens/TutorialSelectScreen.tsx`, replace the JSX returned by the component with:

```tsx
  return (
    <Screen screen="tutorial" hints="[↑↓] move · [⏎] start · [esc] back">
      <box flexDirection="column" gap={0}>
        <text>Tutorial — pick a teacher</text>
        <text>─────────────────────────</text>
        {monsters.map((m, i) => (
          <text key={m.id}>{i === idx ? "▶ " : "  "}{m.name}</text>
        ))}
      </box>
      <text> </text>
      <text>(tutorials are replayable; they don't track progress or feed stats)</text>
    </Screen>
  );
```

Changes:
- `<box flexGrow={1} />` slack absorber removed.
- `<text> </text>` blank row gives one row of breathing room before the footnote (replaces the previous default `gap={1}` and the slack absorber).

- [ ] **Step 5: Migrate `EncounterIntroScreen`**

In `src/screens/EncounterIntroScreen.tsx`, replace the JSX returned by the component with:

```tsx
  return (
    <Screen screen="encounter" hints="[⏎] begin · [esc] back">
      <box flexDirection="column" gap={0}>
        <text>WILD ENCOUNTER MODE</text>
        <text>───────────────────</text>
      </box>
      <text> </text>
      <text>Random monsters from the wild + story pools.</text>
      <text>Slay one and the next appears immediately.</text>
      <text>[esc] flees back to main menu.</text>
    </Screen>
  );
```

Changes:
- Slack absorber removed.
- Blank row added between title and body for visual breathing room.

- [ ] **Step 6: Migrate `VictoryScreen`**

In `src/screens/VictoryScreen.tsx`, replace the JSX returned by the component with:

```tsx
  return (
    <Screen screen="victory" hints="[⏎] continue">
      <box flexDirection="column" gap={0}>
        <text>VICTORY</text>
        <text>───────</text>
      </box>
      <text> </text>
      <text>{monsterName} has fallen.</text>
    </Screen>
  );
```

Changes:
- Slack absorber removed.
- Blank row between title and body.

- [ ] **Step 7: Migrate `EncounterVictoryScreen`**

In `src/screens/EncounterVictoryScreen.tsx`, replace the JSX returned by the component with:

```tsx
  return (
    <Screen screen="victory" hints="any key advances · [esc] menu">
      <box flexDirection="column" gap={0}>
        <text>SLAIN</text>
        <text>─────</text>
      </box>
      <text> </text>
      <text>{monsterName}</text>
      <text>Encounter #{sessionNumber} · kill {killNumberInSession} of this session</text>
    </Screen>
  );
```

Changes:
- Slack absorber removed.
- Same `screen="victory"` as `VictoryScreen` — both post-kill cinematic screens share the status label so the bar doesn't flip between modes.

- [ ] **Step 8: Refactor `app.tsx` — collapse route wrappers + add SaveProvider**

In `src/app.tsx`, the `App` function currently has eight near-identical `if (route.kind === ...)` blocks each returning the same wrapper tree (`<box flexDirection="column" flexGrow={1}><box flexGrow={1}><Screen .../></box>{progressUnwritable ? ... : null}</box>`). Refactor to compute a single `routeJsx` value, then return one wrapped tree.

Add the import at the top of the file (alongside the other `@/components` imports):

```tsx
import { SaveProvider } from "@/components/SaveContext";
```

Replace the entire body of `App()` (everything from the `// ----- screen branches -----` comment through the end of the function) with the structure below. The route-specific JSX blocks themselves are unchanged in content — only their wrapper trees are collapsed. To keep this concrete, here is the full replacement for the block following the existing `buildTraitEventHandler` definition:

```tsx
  // ----- screen branches -----

  let routeJsx: React.ReactElement;
  if (route.kind === "menu") {
    routeJsx = <MenuScreen save={save} onSelect={handleMenuSelect} />;
  } else if (route.kind === "stats") {
    routeJsx = (
      <StatsScreen
        save={save}
        onReset={() => {
          const r = resetStats(save);
          setSave(r.save); updatePersisted(r.persisted);
        }}
        onBack={() => setRoute({ kind: "menu" })}
      />
    );
  } else if (route.kind === "story-select") {
    routeJsx = (
      <StorySelectScreen
        chapters={storyChapters}
        save={save}
        onPickMonster={(chapterId, monsterId) =>
          setRoute({ kind: "combat", chapterId, monsterId, mode: "story" })
        }
        onBack={() => setRoute({ kind: "menu" })}
      />
    );
  } else if (route.kind === "tutorial-select") {
    routeJsx = (
      <TutorialSelectScreen
        monsters={tutorialMonsters}
        onPick={(monsterId) =>
          setRoute({ kind: "combat", chapterId: TUTORIAL_CHAPTER_ID, monsterId, mode: "tutorial" })
        }
        onBack={() => setRoute({ kind: "menu" })}
      />
    );
  } else if (route.kind === "encounter-intro") {
    routeJsx = (
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
    );
  } else if (route.kind === "encounter-fight") {
    const monster = findEncounterMonster(route.monsterId);
    if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
    const onTrait = buildTraitEventHandler("encounter");
    routeJsx = (
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
    );
  } else if (route.kind === "encounter-victory") {
    const monster = findEncounterMonster(route.monsterId);
    if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
    routeJsx = (
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
    );
  } else if (route.kind === "combat") {
    if (route.mode === "tutorial") {
      const monster = findTutorialMonster(route.monsterId);
      if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
      routeJsx = (
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
      );
    } else {
      // story mode
      const found = findStoryMonster(route.chapterId, route.monsterId);
      if (!found) { setRoute({ kind: "menu" }); return <box />; }
      const { chapter, monster } = found;
      const onTrait = buildTraitEventHandler("story");
      routeJsx = (
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
      );
    }
  } else {
    // route.kind === "victory"
    const monster =
      route.mode === "tutorial"
        ? findTutorialMonster(route.monsterId)
        : (findStoryMonster(route.chapterId, route.monsterId)?.monster ?? null);
    if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
    routeJsx = (
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
    );
  }

  return (
    <SaveProvider save={save}>
      <box flexDirection="column" flexGrow={1}>
        <box flexGrow={1}>{routeJsx}</box>
        {progressUnwritable ? <text>⚠ progress not saved</text> : null}
      </box>
    </SaveProvider>
  );
}
```

Notes:
- The eight previous wrapper trees are replaced by one shared shell at the bottom.
- The two early-return cases for missing monsters (lines previously ~222 and ~257 in `app.tsx`) keep their bare `<text>` returns — they're error states that don't go through the shell. This is fine; on error there's no save context but no Screen is rendered either.
- The `route.kind === "victory"` block at the very end becomes the `else` branch of the `if/else if` ladder.
- `<SaveProvider save={save}>` wraps the entire shell so any rendered Screen's `<StatusBar>` can read save data.

- [ ] **Step 9: Run tests + type-check + content validator**

Run: `bun test && bunx tsc --noEmit && bun run validate-content`
Expected:
- All existing tests still pass (helpers like `renderStatsRowText`, `flattenEntries` are unchanged).
- StatusBar tests (9) and SaveContext tests (4) pass.
- ChromeBar tests (5) still pass — ChromeBar.tsx still exists; Task 5 deletes it.
- `tsc` clean.
- Content validator clean.

If any of these fail, fix inline before moving on. Likely failure modes:
- A screen still imports `<Screen>` without passing `screen=`. Fix the screen.
- `app.tsx` has a typo in the route-branch refactor. Diff against the previous version.

- [ ] **Step 10: Combined commit covering Task 4 in full**

```bash
git add src/components/Screen.tsx \
        src/screens/StatsScreen.tsx src/screens/StorySelectScreen.tsx \
        src/screens/TutorialSelectScreen.tsx src/screens/EncounterIntroScreen.tsx \
        src/screens/VictoryScreen.tsx src/screens/EncounterVictoryScreen.tsx \
        src/app.tsx
git commit -m "refactor(screens): adopt Claude Code-style layout with bottom StatusBar"
```

This single commit lands the Screen rewrite, the six screen migrations, and the app shell refactor atomically. None work in isolation, so they ship together.

---

## Task 5: Delete `ChromeBar`

`ChromeBar` and its tests are no longer referenced anywhere. Remove them.

**Files:**
- Delete: `src/components/ChromeBar.tsx`
- Delete: `tests/components/ChromeBar.test.ts`

- [ ] **Step 1: Confirm no remaining references**

Run: `grep -rn 'ChromeBar' src tests`
Expected: no results. If any remain, do NOT delete; fix the reference first (likely a stale import).

- [ ] **Step 2: Delete the files**

```bash
rm src/components/ChromeBar.tsx tests/components/ChromeBar.test.ts
```

- [ ] **Step 3: Verify the build still passes**

Run: `bun test && bunx tsc --noEmit`
Expected: 5 fewer ChromeBar tests in the count; otherwise green.

- [ ] **Step 4: Commit**

```bash
git add -u src/components/ChromeBar.tsx tests/components/ChromeBar.test.ts
git commit -m "chore(layout): delete unused ChromeBar after StatusBar migration"
```

---

## Task 6: Manual verification

Layout changes are visual — only `bun run dev` confirms the result. The user has flagged earlier iterations as "jumping" or "still off"; this verification checks the new bottom-anchored frame holds together.

**Files:** none (verification only).

- [ ] **Step 1: Re-run automated checks**

Run: `bun run validate-content && bun test && bunx tsc --noEmit`
Expected: validator clean, all tests pass, `tsc` clean.

- [ ] **Step 2: Start the dev runner**

Run: `bun run dev`
Expected: app boots into the menu.

- [ ] **Step 3: Verify the status bar appears on every non-Menu screen**

Navigate to each of the 6 migrated screens and confirm:
- Bottom row 2 from the bottom shows `─── regxslayer · <screen> · <N> slain · <M> sessions ─...─`.
- Bottom row shows the screen's hints, e.g. `[r] reset · [esc] back` on Stats.
- The status block is identical width to the terminal — fills edge to edge.

Screens to check (and the `screen` label each should show):
- Stats → `stats`
- Story select → `story`
- Tutorial select → `tutorial`
- Encounter intro → `encounter`
- Encounter victory (Menu → Encounter → kill a monster) → `victory`
- Victory (Menu → Story → finish a chapter monster) → `victory`

- [ ] **Step 4: Verify content top-anchors (no eye-jumping)**

Navigate Menu → Stats → Story → Tutorial → Encounter → back to Menu in quick succession. Confirm:
- Each screen's title (`STATS`, `Choose your fight`, etc.) appears at row 2 (top padding) — same row across navigations.
- The status block stays pinned at the bottom across navigations.
- No content "jumps" to a new vertical position when switching screens.

- [ ] **Step 5: Verify the universal scrollbox handles overflow**

Resize the terminal to ~24 rows. Navigate Menu → Stats. Confirm:
- The trait list overflows the visible area but the status bar remains pinned at the bottom.
- Scrolling (arrow keys or `j`/`k`) reveals the rest of the list.
- The `(esc) back` hint on the status bar is still visible.

If scrolling is broken or the status bar gets pushed off-screen, the universal-scrollbox approach failed at runtime — see the Task 3 fallback note.

- [ ] **Step 6: Verify Stats's `footer` confirm prompt is always visible**

In Stats on a short terminal (~24 rows), press `[r]` to enter the confirm state. Confirm:
- The "Reset all trait stats? ..." prompt appears just above the status bar.
- Scrolling within the trait list does NOT hide the confirm prompt.
- Pressing `n` or any other key dismisses the confirm; pressing `y` resets stats.

- [ ] **Step 7: Verify the Menu and Combat are unaffected**

- Menu still renders the trophy-wall layout with no status bar at the bottom (its banner and stats anchor visually).
- Start a combat (Menu → Story → pick a monster). The play screen still uses its full-bleed sidebar+body layout with no status bar.

- [ ] **Step 8: Verify cinematic screens still feel intentional**

- Trigger Victory and EncounterVictory. Confirm:
  - `VICTORY`/`SLAIN` title sits at row 2 (top padding), left-aligned in the column.
  - Body content sits below the title.
  - Status bar at the bottom shows `screen="victory"` for both.
  - The status label staying steady between Victory and EncounterVictory transitions feels consistent (vs. iteration-2 where the in-page hint changed).

- [ ] **Step 9: Verify save data flows through SaveProvider**

- Note the `<N> slain` and `<M> sessions` numbers on any non-Menu screen.
- Kill a monster (Encounter mode is fastest). Return to a non-Menu screen. Confirm `<N>` incremented by 1.
- Start a new encounter session. Confirm `<M>` incremented.

- [ ] **Step 10: No commit needed unless verification surfaced a fix**

If a fix is required, commit it here with a descriptive message.

---

## Self-Review Checklist (for the engineer running this plan)

Before marking the plan complete, confirm:

- [ ] `<StatusBar>` renders on all 6 migrated screens — and NOT on Menu or Combat.
- [ ] The status bar's `screen` label and `hints` text match the spec table for each screen.
- [ ] `<VictoryScreen>` and `<EncounterVictoryScreen>` both pass `screen="victory"` (intentional cohesion; only the on-page title differs).
- [ ] Screen titles render at row 2 across navigations (no eye-jumping).
- [ ] Long lists (Stats, StorySelect) scroll inside Screen's universal scrollbox without clipping the status bar.
- [ ] StatsScreen's reset-confirm prompt uses Screen's `footer` prop and stays visible above the status bar regardless of scroll.
- [ ] No screen still uses `centerVertically` (the prop has been gone since iteration 2).
- [ ] `<ChromeBar>` and `tests/components/ChromeBar.test.ts` are deleted; `grep -rn ChromeBar src tests` returns no results.
- [ ] `<SaveProvider>` wraps the route switch in `app.tsx`; lifetime numbers in the status bar update after kills.
- [ ] `bun test`, `bun run validate-content`, and `bunx tsc --noEmit` all pass.
- [ ] Visual verification done in `bun run dev`.
