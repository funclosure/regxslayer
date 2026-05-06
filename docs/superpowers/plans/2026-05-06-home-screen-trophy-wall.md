# Home Screen — Trophy Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add chapter-progress bars and a lifetime-stats line to the Home (Menu) screen while keeping the existing pixel title and monster art, so returning players see progress at a glance.

**Architecture:** Single-file change to `src/screens/MenuScreen.tsx`. Three new pure helpers (`buildContinueLabel`, `buildChapterRows`, `buildBottomLine`), plus a `CHAPTERS` constant with a drift-guard test. `LANDING_ART` splits into `TITLE_ART`, `MONSTER_ART`, and `TAGLINE` constants so the monster band can align row-for-row with the chapter box. `buildLandingRows` gains a `save` parameter and composes the new layout. The React component renders one centered box per logical block.

**Tech Stack:** TypeScript, React, `@gridland/utils` TUI primitives, Bun test runner.

**Spec:** `docs/superpowers/specs/2026-05-06-home-screen-trophy-wall-design.md`

---

## File Structure

- **Modify**: `src/screens/MenuScreen.tsx` — all production changes here.
- **Modify**: `tests/screens/MenuScreen.test.ts` — existing tests adapted to new `buildLandingRows(save, items, idx)` signature; new test cases added for each helper.
- **No new files.** A new `ChapterProgress` component does not earn its own file; three rows of text inside an existing layout don't justify it (per spec §5).

---

## Task 1: `CHAPTERS` constant + drift-guard test

Adds the static chapter table that the chapter box renders from. The drift-guard test makes the build fail loudly if a chapter ever gains/loses monsters without us updating `total`.

**Files:**
- Modify: `src/screens/MenuScreen.tsx` — add `CHAPTERS` constant.
- Modify: `tests/screens/MenuScreen.test.ts` — add drift-guard test.

- [ ] **Step 1: Write the failing test**

Add at the end of `tests/screens/MenuScreen.test.ts`:

```ts
import { CHAPTERS } from "@/screens/MenuScreen";
import { chapter as ch1 } from "@/content/chapter-1-literals";
import { chapter as ch2 } from "@/content/chapter-2-charclasses";
import { chapter as ch3 } from "@/content/chapter-3-quantifiers";

describe("CHAPTERS constant", () => {
  test("ids match the three story chapters in display order", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual([
      "literals-anchors",
      "char-classes",
      "quantifiers",
    ]);
  });

  test("totals match each chapter module's monsters length (drift guard)", () => {
    const modules = [ch1, ch2, ch3];
    CHAPTERS.forEach((entry, i) => {
      expect(entry.total).toBe(modules[i]!.monsters.length);
      expect(entry.id).toBe(modules[i]!.id);
    });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: FAIL with "CHAPTERS is not exported from @/screens/MenuScreen" (or similar import error).

- [ ] **Step 3: Add the `CHAPTERS` constant**

Insert in `src/screens/MenuScreen.tsx` immediately after the `MenuItem` type alias near the top:

```ts
export const CHAPTERS: ReadonlyArray<{ id: string; short: string; total: number }> = [
  { id: "literals-anchors", short: "Literals", total: 4 },
  { id: "char-classes",     short: "Classes",  total: 4 },
  { id: "quantifiers",      short: "Quants",   total: 4 },
];
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: PASS for the two new `CHAPTERS constant` tests; existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/MenuScreen.tsx tests/screens/MenuScreen.test.ts
git commit -m "feat(menu): add CHAPTERS constant with drift-guard test"
```

---

## Task 2: `buildContinueLabel` helper + integration

Pure helper that builds the menu row label for Continue (with a `(last: <mode>)` annotation) or returns `null` when Continue should be hidden. `buildMenuItems` is updated to use it.

**Files:**
- Modify: `src/screens/MenuScreen.tsx` — add `buildContinueLabel`, update `buildMenuItems`.
- Modify: `tests/screens/MenuScreen.test.ts` — add helper tests; update an existing assertion that hard-codes the old `"▶ Continue"` text.

- [ ] **Step 1: Write the failing tests**

Add to `tests/screens/MenuScreen.test.ts`:

```ts
import { buildContinueLabel } from "@/screens/MenuScreen";

describe("buildContinueLabel", () => {
  test("returns null when lastMode is null", () => {
    expect(buildContinueLabel(null)).toBe(null);
  });

  test("formats label with mode suffix for each save mode", () => {
    expect(buildContinueLabel("story")).toBe("Continue   (last: story)");
    expect(buildContinueLabel("encounter")).toBe("Continue   (last: encounter)");
    expect(buildContinueLabel("tutorial")).toBe("Continue   (last: tutorial)");
  });
});

describe("buildMenuItems with lastMode", () => {
  test("Continue item label includes the (last: …) suffix", () => {
    const items = buildMenuItems({ ...empty, lastMode: "encounter" });
    expect(items[0]).toEqual({ key: "continue", label: "Continue   (last: encounter)" });
  });
});
```

Then **update** the existing assertion in the `buildLandingRows` describe block from:

```ts
expect(rows.map((row) => row.trimEnd())).toContain("▶ Continue");
```

to:

```ts
expect(rows.map((row) => row.trimEnd())).toContain("▶ Continue   (last: story)");
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: FAIL — `buildContinueLabel is not defined`, and the updated assertion fails because the current label is just `"▶ Continue"`.

- [ ] **Step 3: Implement `buildContinueLabel` and update `buildMenuItems`**

In `src/screens/MenuScreen.tsx`, add (place above `buildMenuItems`):

```ts
export function buildContinueLabel(lastMode: SaveFile["lastMode"]): string | null {
  if (lastMode === null) return null;
  return `Continue   (last: ${lastMode})`;
}
```

Then change `buildMenuItems` to:

```ts
export function buildMenuItems(save: SaveFile): MenuItem[] {
  const items: MenuItem[] = [];
  const continueLabel = buildContinueLabel(save.lastMode);
  if (continueLabel !== null) items.push({ key: "continue", label: continueLabel });
  items.push({ key: "story", label: "Story" });
  items.push({ key: "encounter", label: "Encounter" });
  items.push({ key: "tutorial", label: "Tutorial" });
  items.push({ key: "stats", label: "Stats" });
  items.push({ key: "quit", label: "Quit" });
  return items;
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: PASS for new `buildContinueLabel` and `buildMenuItems with lastMode` blocks; the updated `buildLandingRows` assertion passes; original "hides Continue" / "shows Continue first" tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/MenuScreen.tsx tests/screens/MenuScreen.test.ts
git commit -m "feat(menu): annotate Continue with (last: <mode>) suffix"
```

---

## Task 3: `buildChapterRows` helper

Renders the bordered chapter-progress block as 5 rows of text (top border, three chapter rows, bottom border). Inner width 21 chars, outer width 23.

**Files:**
- Modify: `src/screens/MenuScreen.tsx` — add `buildChapterRows`.
- Modify: `tests/screens/MenuScreen.test.ts` — add helper tests.

- [ ] **Step 1: Write the failing tests**

Add to `tests/screens/MenuScreen.test.ts`:

```ts
import { buildChapterRows } from "@/screens/MenuScreen";

const stubRecord = () => ({ slainAt: "2026-05-06T00:00:00Z", bestRegexes: {} });

describe("buildChapterRows", () => {
  test("renders empty save with all zero bars", () => {
    const rows = buildChapterRows(empty);
    expect(rows).toEqual([
      "┌─ chapters ──────────┐",
      "│ 1 Literals ░░░░ 0/4 │",
      "│ 2 Classes  ░░░░ 0/4 │",
      "│ 3 Quants   ░░░░ 0/4 │",
      "└─────────────────────┘",
    ]);
  });

  test("fills bars from chapter records", () => {
    const save: SaveFile = {
      ...empty,
      chapters: {
        "literals-anchors": { monsters: { a: stubRecord(), b: stubRecord(), c: stubRecord(), d: stubRecord() } },
        "char-classes":     { monsters: { a: stubRecord(), b: stubRecord() } },
      },
    };
    const rows = buildChapterRows(save);
    expect(rows[1]).toBe("│ 1 Literals ████ 4/4 │");
    expect(rows[2]).toBe("│ 2 Classes  ██░░ 2/4 │");
    expect(rows[3]).toBe("│ 3 Quants   ░░░░ 0/4 │");
  });

  test("clamps overflow chapters to the 4-cell bar width", () => {
    const overfilled: Record<string, ReturnType<typeof stubRecord>> = {};
    for (let i = 0; i < 6; i++) overfilled[`m${i}`] = stubRecord();
    const save: SaveFile = {
      ...empty,
      chapters: { "literals-anchors": { monsters: overfilled } },
    };
    const rows = buildChapterRows(save);
    expect(rows[1]).toBe("│ 1 Literals ████ 6/4 │");
  });

  test("every row is the same outer width (23)", () => {
    const rows = buildChapterRows(empty);
    expect(new Set(rows.map((r) => [...r].length)).size).toBe(1);
    expect([...rows[0]!].length).toBe(23);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: FAIL with "buildChapterRows is not exported".

- [ ] **Step 3: Implement `buildChapterRows`**

In `src/screens/MenuScreen.tsx`, add below `buildMenuItems`:

```ts
const CHAPTER_BOX_TOP    = "┌─ chapters ──────────┐";
const CHAPTER_BOX_BOTTOM = "└─────────────────────┘";

export function buildChapterRows(save: SaveFile): string[] {
  const body = CHAPTERS.map((c, i) => {
    const slain = Object.keys(save.chapters[c.id]?.monsters ?? {}).length;
    const filled = Math.min(slain, 4);
    const bar = "█".repeat(filled) + "░".repeat(4 - filled);
    const inner = ` ${i + 1} ${c.short.padEnd(8)} ${bar} ${slain}/${c.total} `;
    return `│${inner}│`;
  });
  return [CHAPTER_BOX_TOP, ...body, CHAPTER_BOX_BOTTOM];
}
```

Note: the width assertion uses `[...r].length` (code-point count) because box-drawing characters count as one code point but `.length` on a string with multi-byte sequences would also be 1 here — both work. The `[...r].length` form is robust for future emoji/wide chars.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: PASS for all four `buildChapterRows` tests.

- [ ] **Step 5: Commit**

```bash
git add src/screens/MenuScreen.tsx tests/screens/MenuScreen.test.ts
git commit -m "feat(menu): add buildChapterRows progress block"
```

---

## Task 4: `buildBottomLine` helper

Welcome variant for fresh saves; stats variant once any kill or session has been recorded.

**Files:**
- Modify: `src/screens/MenuScreen.tsx` — add `buildBottomLine`.
- Modify: `tests/screens/MenuScreen.test.ts` — add helper tests.

- [ ] **Step 1: Write the failing tests**

Add to `tests/screens/MenuScreen.test.ts`:

```ts
import { buildBottomLine } from "@/screens/MenuScreen";

describe("buildBottomLine", () => {
  test("welcomes a fresh player when no kills and no sessions", () => {
    expect(buildBottomLine(empty)).toBe("[↑↓] move · [enter] choose · [q] quit");
  });

  test("shows kill stats when player has progress", () => {
    const save: SaveFile = { ...empty, storyKills: 30, encounterKills: 7, encounterSessions: 4 };
    expect(buildBottomLine(save)).toBe("37 slain · 4 sessions · [↑↓] [enter]");
  });

  test("shows stats variant when only sessions are nonzero", () => {
    const save: SaveFile = { ...empty, encounterSessions: 1 };
    expect(buildBottomLine(save)).toBe("0 slain · 1 sessions · [↑↓] [enter]");
  });

  test("shows stats variant when only kills are nonzero", () => {
    const save: SaveFile = { ...empty, storyKills: 1 };
    expect(buildBottomLine(save)).toBe("1 slain · 0 sessions · [↑↓] [enter]");
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: FAIL with "buildBottomLine is not exported".

- [ ] **Step 3: Implement `buildBottomLine`**

In `src/screens/MenuScreen.tsx`, add below `buildChapterRows`:

```ts
export function buildBottomLine(save: SaveFile): string {
  const slain = save.storyKills + save.encounterKills;
  const sessions = save.encounterSessions;
  if (slain === 0 && sessions === 0) {
    return "[↑↓] move · [enter] choose · [q] quit";
  }
  return `${slain} slain · ${sessions} sessions · [↑↓] [enter]`;
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: PASS for all four `buildBottomLine` tests.

- [ ] **Step 5: Commit**

```bash
git add src/screens/MenuScreen.tsx tests/screens/MenuScreen.test.ts
git commit -m "feat(menu): add buildBottomLine welcome+stats variants"
```

---

## Task 5: Split `LANDING_ART` and recompose `buildLandingRows`

Splits the monolithic `LANDING_ART` constant into `TITLE_ART`, `MONSTER_ART`, and `TAGLINE`. Removes the inline `[^filler] / \w+ / ^heart$` regex annotations from the monster art (they are replaced by the chapter box on the right). Updates `buildLandingRows` to take `save` and compose the new layout: title → monster band joined row-for-row with chapter box → tagline → menu → bottom line, with blank-row gutters.

**Files:**
- Modify: `src/screens/MenuScreen.tsx` — split constants, update `buildLandingRows` signature and body, remove obsolete `LANDING_ART` and `LANDING_WIDTH`.
- Modify: `tests/screens/MenuScreen.test.ts` — update existing `buildLandingRows` tests; add new ones for empty/populated save composition.

- [ ] **Step 1: Update existing tests and add new ones**

Replace the entire existing `describe("buildLandingRows", ...)` block in `tests/screens/MenuScreen.test.ts` with:

```ts
describe("buildLandingRows", () => {
  test("renders title, monster, tagline, chapter box, menu, and bottom line", () => {
    const save: SaveFile = { ...empty, lastMode: "story", storyKills: 5 };
    const rows = buildLandingRows(save, buildMenuItems(save), 0);
    expect(rows.some((row) => row.includes("____  _____"))).toBe(true);
    expect(rows.some((row) => row.includes(".----."))).toBe(true);
    expect(rows.some((row) => row.includes("┌─ chapters"))).toBe(true);
    expect(rows.map((row) => row.trim())).toContain("precision is damage");
    expect(rows.map((row) => row.trimEnd())).toContain("▶ Continue   (last: story)");
    expect(rows.map((row) => row.trimEnd())).toContain("  Story");
    expect(rows.some((row) => row.includes("5 slain · 0 sessions"))).toBe(true);
  });

  test("hides Continue and shows welcome bottom line on a fresh save", () => {
    const rows = buildLandingRows(empty, buildMenuItems(empty), 0);
    expect(rows.some((row) => row.includes("Continue"))).toBe(false);
    expect(rows.some((row) => row.includes("[↑↓] move · [enter] choose · [q] quit"))).toBe(true);
    expect(rows.some((row) => row.includes("░░░░ 0/4"))).toBe(true);
  });

  test("monster band joins monster art with chapter box row-for-row", () => {
    const rows = buildLandingRows(empty, buildMenuItems(empty), 0);
    const bandRow = rows.find((row) => row.includes(".----.") && row.includes("┌─ chapters"));
    expect(bandRow).toBeDefined();
  });

  test("removes the legacy [^filler] / \\w+ / ^heart$ regex annotations", () => {
    const rows = buildLandingRows(empty, buildMenuItems(empty), 0);
    expect(rows.some((row) => row.includes("[^filler]"))).toBe(false);
    expect(rows.some((row) => row.includes("^heart$"))).toBe(false);
  });

  test("keeps every landing row within the minimum terminal width", () => {
    const rows = buildLandingRows({ ...empty, lastMode: "story" }, buildMenuItems({ ...empty, lastMode: "story" }), 0);
    expect(Math.max(...rows.map((row) => row.length))).toBeLessThanOrEqual(76);
  });
});
```

The existing `describe("buildLandingRows", ...)` block (lines ~34–56) is fully replaced.

The standalone `describe` block for `buildMenuRows` (the `left-aligns options inside the centered menu block` test) stays unchanged — `buildMenuRows` semantics don't change.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: FAIL — `buildLandingRows` is currently called with `(items, idx)`, the new tests call it with `(save, items, idx)`. Some tests also assert chapter-box presence which doesn't exist yet.

- [ ] **Step 3: Restructure constants and helpers**

In `src/screens/MenuScreen.tsx`, **remove** the existing `LANDING_ART`, `LANDING_WIDTH`, and `padRows` definitions and the existing `buildLandingRows` body. Add the following in their place (above `buildLandingRows`):

```ts
const TITLE_ART = [
  " ____  _____ ____ __  __ ____  _      _ __   _______ ____",
  "|  _ \\| ____/ ___|\\ \\/ / ___|| |    / \\\\ \\ / / ____|  _ \\",
  "| |_) |  _|| |  _  \\  /\\___ \\| |   / _ \\\\ V /|  _| | |_) |",
  "|  _ <| |__| |_| | /  \\ ___) | |__/ ___ \\| | | |___|  _ <",
  "|_| \\_\\_____\\____|/_/\\_\\____/|____/_/   \\_\\_| |_____|_| \\_\\",
];

const MONSTER_ART = [
  "          .----.",
  "      ___/ .  . \\___",
  "     /   \\  --  /   \\",
  "     \\____\\____/____/",
  "          /_||_\\",
];

const TAGLINE = "precision is damage";

const TITLE_WIDTH    = Math.max(...TITLE_ART.map((row) => row.length));
const MONSTER_WIDTH  = Math.max(...MONSTER_ART.map((row) => row.length));
const BAND_GAP       = "    "; // 4 spaces between monster art and chapter box

function padRows(rows: string[], width: number): string[] {
  return rows.map((row) => row.padEnd(width, " "));
}
```

`MONSTER_ART` must have exactly 5 rows, matching the 5-row chapter box (top border + 3 chapter rows + bottom border).

- [ ] **Step 4: Implement the new `buildLandingRows`**

Replace `buildLandingRows` with:

```ts
export function buildLandingRows(save: SaveFile, items: MenuItem[], selectedIdx: number): string[] {
  const titleRows   = padRows(TITLE_ART, TITLE_WIDTH);
  const chapterRows = buildChapterRows(save);
  const monsterRows = padRows(MONSTER_ART, MONSTER_WIDTH);
  const bandRows = monsterRows.map((row, i) => row + BAND_GAP + (chapterRows[i] ?? ""));
  const menuRows = buildMenuRows(items, selectedIdx);
  return [
    ...titleRows,
    "",
    ...bandRows,
    "",
    TAGLINE,
    "",
    ...menuRows,
    "",
    buildBottomLine(save),
  ];
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: PASS — all `buildLandingRows` tests pass; helper tests still pass; menu tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/screens/MenuScreen.tsx tests/screens/MenuScreen.test.ts
git commit -m "feat(menu): compose trophy-wall layout in buildLandingRows"
```

---

## Task 6: Wire `MenuScreen` component to the new layout

The component currently renders two separate boxes (art block + menu block). Replace with a single composition driven by `buildLandingRows`, since each row is now self-contained.

**Files:**
- Modify: `src/screens/MenuScreen.tsx` — update the JSX returned by `MenuScreen`.

- [ ] **Step 1: Replace the JSX**

In `src/screens/MenuScreen.tsx`, replace the current `MenuScreen` body (the part inside `function MenuScreen` from `const items = …` through the closing `}` of the function) with:

```ts
export function MenuScreen({ save, onSelect }: MenuScreenProps): React.ReactElement {
  const items = buildMenuItems(save);
  const [idx, setIdx] = useState(0);
  const rows = buildLandingRows(save, items, idx);
  const width = Math.max(...rows.map((row) => row.length), 0);

  useKeyboard((e: KeyEvent) => {
    if (e.name === "up") setIdx((i) => navigateMenu(items.length, i, "up"));
    else if (e.name === "down") setIdx((i) => navigateMenu(items.length, i, "down"));
    else if (e.name === "return") {
      const item = items[idx];
      if (item) onSelect(item.key);
    }
  }, { global: true });

  return (
    <box flexDirection="column" flexGrow={1} padding={2} alignItems="center" justifyContent="center">
      <box flexDirection="column" width={width}>
        {rows.map((row, i) => (
          <text key={`row:${i}:${row}`}>{row}</text>
        ))}
      </box>
    </box>
  );
}
```

The single inner `<box>` is sized to the widest row (the title block). All rows render left-aligned within that box; the parent box centers it on screen via `alignItems="center"`. Menu rows look centered because `buildLandingRows` produces them as-is and the menu happens to be visually narrower than the title — the test `left-aligns options inside the centered menu block` is unaffected (it asserts on `buildMenuRows`, not on the rendered output).

- [ ] **Step 2: Run the test suite**

Run: `bun test tests/screens/MenuScreen.test.ts`
Expected: PASS — no test changes needed in this step; the JSX edit is render-only.

- [ ] **Step 3: Type-check the project**

Run: `bun run typecheck` (or `bunx tsc --noEmit` if no script is defined).
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/MenuScreen.tsx
git commit -m "refactor(menu): render landing as a single row stream"
```

---

## Task 7: Manual verification with `bun run dev`

The matcher has unit tests but the rendering itself is visual. Verify the three states a real player will see.

**Files:** none (verification only).

- [ ] **Step 1: Start the dev runner**

Run: `bun run dev`
Expected: app boots into the menu screen.

- [ ] **Step 2: Verify the fresh-save state**

If a save file already exists, move it aside first:
- Locate the save path (check `src/game/save.ts` or wherever the save is read).
- Rename it (e.g., `mv path/to/save.json path/to/save.json.bak`).
- Restart the dev runner.

In the menu, confirm:
- No `Continue` row.
- Chapter box shows three `░░░░ 0/4` rows.
- Bottom line reads `[↑↓] move · [enter] choose · [q] quit`.
- Menu navigates Story → Encounter → Tutorial → Stats → Quit.

- [ ] **Step 3: Verify the populated state**

Restore the backed-up save (`mv path/to/save.json.bak path/to/save.json`) or play a couple of monsters in any mode, then quit back to the menu. Confirm:
- `Continue` row appears at the top with the correct `(last: <mode>)` suffix.
- Chapter box shows correct fill levels for chapters with progress.
- Bottom line shows `<N> slain · <M> sessions · [↑↓] [enter]`.

- [ ] **Step 4: Verify width on a narrow terminal**

Resize the terminal to ~80 columns. The menu screen should not wrap or clip. Already enforced by the ≤76 test, but eyeball it.

- [ ] **Step 5: Run the validator and full test suite**

Run: `bun run validate-content && bun test`
Expected: all content checks and all tests pass.

- [ ] **Step 6: Commit any restorations or notes (if needed)**

If the manual verification surfaced an issue you fixed, commit the fix here. Otherwise nothing to commit.

---

## Self-Review Checklist (for the engineer running this plan)

Before marking the plan complete, confirm:

- [ ] Continue row is hidden when `lastMode === null` and shows `(last: <mode>)` otherwise.
- [ ] Chapter box renders even on a fresh save (three `░░░░ 0/4` rows).
- [ ] Tagline `precision is damage` appears between the monster band and the menu.
- [ ] Bottom line is the welcome variant for a fresh save and the stats variant once any kill or session is recorded.
- [ ] No `[^filler]`, `\w+`, or `^heart$` annotations remain on the landing.
- [ ] Every landing row ≤ 76 chars (test enforces this).
- [ ] `buildMenuRows` left-alignment test still passes (its semantics did not change).
- [ ] `bun test` and `bun run validate-content` both pass.
