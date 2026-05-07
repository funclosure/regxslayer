# Shell Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified Shell layer that gives every screen the same persistent frame — single live scene above, one-line status row, bordered input panel at the bottom — with five panel modes (text, choice, prompt, banner, cheatsheet). Migrate every existing screen onto this shell, including the previously-exempt Menu and Combat.

**Architecture:** New `Shell`, `InputPanel`, and five `panel/*` components live under `src/components/shell/`. The five panel-mode components each compose `InputPanel` internally so screens pass a single `<Prompt>` / `<ChoiceList>` / etc. element to the shell. Pure helpers (border builders, list navigation, scroll window) sit alongside their components and get unit tests in `tests/components/shell/`. Migration is staged: scaffolding → simple migrations → choice-mode migrations → MenuScreen → CombatScreen → cleanup of the old `Screen.tsx`.

**Tech Stack:** TypeScript + React 19 (gridland JSX intrinsics: `<box>`, `<text>`, `<span>`, `<input>`, `<scrollbox>`), Bun runtime, `bun test` for tests.

**Spec:** `docs/superpowers/specs/2026-05-07-shell-layer-design.md`.

---

## File Structure

```
src/components/shell/
  Shell.tsx              # frame component + computeShellWidth helper
  InputPanel.tsx         # bordered chrome + 3 format helpers
  SceneFrame.tsx         # centered 64-col scrollbox helper
  panel/
    TextInput.tsx        # combat: regex input + feedback rows
    ChoiceList.tsx       # choice list + navigation/scroll helpers
    Prompt.tsx           # single dim hint line
    BannerSlot.tsx       # ShimmerBanner host
    Cheatsheet.tsx       # chapter cheatsheet rows

tests/components/shell/
  Shell.test.ts          # computeShellWidth
  InputPanel.test.ts     # 3 border format helpers
  ChoiceList.test.ts     # navigateChoiceList + computeScrollWindow

# Modified later:
src/components/StatusBar.tsx     # drop formatStatusHintRow in cleanup
src/components/Screen.tsx        # deleted in cleanup
src/screens/*.tsx                # each migrated to Shell
src/app.tsx                      # routes return Shell-rooted trees
```

Key conventions reused from the existing codebase:

- Pure helpers exported from component files; React rendering not unit-tested (matches `StatusBar.tsx` / `BodyView.tsx` style).
- Tests use `bun:test` with `describe` / `test` / `expect`.
- Imports use the `@/` alias (configured in `tsconfig.json`).
- Indent = 2 spaces; double-quoted strings; no semicolons missing.

---

## Stage 1 — Scaffolding + EncounterVictoryScreen migration

### Task 1: Add `computeShellWidth` helper + Shell component

**Files:**
- Create: `src/components/shell/Shell.tsx`
- Test: `tests/components/shell/Shell.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/shell/Shell.test.ts
import { describe, expect, test } from "bun:test";
import { computeShellWidth } from "@/components/shell/Shell";

describe("computeShellWidth", () => {
  test("returns terminalWidth when capWidth=false (combat case)", () => {
    expect(computeShellWidth(80, false)).toBe(80);
    expect(computeShellWidth(200, false)).toBe(200);
  });

  test("returns terminalWidth when below cap and capWidth=true", () => {
    expect(computeShellWidth(80, true)).toBe(80);
    expect(computeShellWidth(140, true)).toBe(140);
  });

  test("clamps to 140 when above cap and capWidth=true", () => {
    expect(computeShellWidth(141, true)).toBe(140);
    expect(computeShellWidth(200, true)).toBe(140);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/components/shell/Shell.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Shell + helper**

```tsx
// src/components/shell/Shell.tsx
import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { useSaveLifetime } from "@/components/SaveContext";
import { formatStatusInfoRow, BRAND } from "@/components/StatusBar";

/** Cap width applied to non-combat shells on wide terminals. */
export const SHELL_MAX_WIDTH = 140;

/** Pure: returns the effective shell width given the terminal width and cap policy. */
export function computeShellWidth(terminalWidth: number, capWidth: boolean): number {
  if (!capWidth) return terminalWidth;
  return Math.min(terminalWidth, SHELL_MAX_WIDTH);
}

export type ShellProps = {
  /** Free-form scene region (above status + panel). Owns its own layout. */
  scene: React.ReactNode;
  /** A panel-mode element: <Prompt/>, <ChoiceList/>, <TextInput/>, <BannerSlot/>, <Cheatsheet/>. */
  panel: React.ReactElement;
  /** Short screen identifier (e.g. "menu", "combat"). Renders in the status row. */
  screen: string;
  /** When false (combat only), the shell stretches to the full terminal width. Default true. */
  capWidth?: boolean;
};

export function Shell(props: ShellProps): React.ReactElement {
  const { scene, panel, screen, capWidth = true } = props;
  const { width } = useTerminalDimensions();
  const shellWidth = computeShellWidth(width, capWidth);

  // Status row is rendered inline here (not via <StatusBar>) so the new shell stays
  // single-row even while the legacy Screen wrapper still emits the two-row StatusBar.
  // Stage 5 cleanup deletes the legacy hint row entirely.
  const { slain, sessions } = useSaveLifetime();
  const status = formatStatusInfoRow(BRAND, screen, slain, sessions, shellWidth);

  // Inject capWidth into the panel so its internal width matches the shell — caller
  // never has to remember to pass capWidth to both. cloneElement merges, so panel
  // props the caller already set (items, hint text, etc.) are preserved.
  const sizedPanel = React.cloneElement(panel, { capWidth });

  const inner = (
    <box flexDirection="column" flexGrow={1} width={shellWidth}>
      <box flexDirection="column" flexGrow={1}>{scene}</box>
      <text>{status}</text>
      {sizedPanel}
    </box>
  );

  // Wide-terminal cap: when capping is active, center the inner column.
  if (shellWidth < width) {
    return (
      <box flexDirection="column" flexGrow={1} alignItems="center" width="100%">
        {inner}
      </box>
    );
  }
  return inner;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/components/shell/Shell.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/shell/Shell.tsx tests/components/shell/Shell.test.ts
git commit -m "feat(shell): add Shell frame + computeShellWidth helper"
```

---

### Task 2: Add InputPanel + border format helpers

**Files:**
- Create: `src/components/shell/InputPanel.tsx`
- Test: `tests/components/shell/InputPanel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/shell/InputPanel.test.ts
import { describe, expect, test } from "bun:test";
import {
  formatPanelTopBorder,
  formatPanelBottomBorder,
  formatPanelFooterRule,
} from "@/components/shell/InputPanel";

describe("formatPanelTopBorder", () => {
  test("no header — full rule with rounded corners", () => {
    const row = formatPanelTopBorder(20);
    expect(row).toBe("╭" + "─".repeat(18) + "╮");
    expect([...row].length).toBe(20);
  });

  test("with header — '╭─ <header> ─...─╮'", () => {
    const row = formatPanelTopBorder(30, "Choose your fight");
    expect([...row].length).toBe(30);
    expect(row.startsWith("╭─ Choose your fight ")).toBe(true);
    expect(row.endsWith("╮")).toBe(true);
    const middle = row.slice("╭─ Choose your fight ".length, -1);
    expect([...middle].every((c) => c === "─")).toBe(true);
  });

  test("header that exactly fits leaves no trailing dashes", () => {
    // width 12: corners(2) + "─ x " (4) + corner(1) → header that needs 5 inner cols
    const row = formatPanelTopBorder(8, "x");
    expect([...row].length).toBe(8);
    expect(row).toBe("╭─ x ──╮");
  });

  test("header longer than available space is truncated to fit", () => {
    const row = formatPanelTopBorder(10, "very long header that overflows");
    expect([...row].length).toBe(10);
    expect(row.startsWith("╭")).toBe(true);
    expect(row.endsWith("╮")).toBe(true);
  });
});

describe("formatPanelBottomBorder", () => {
  test("rounded corners, dashes between", () => {
    const row = formatPanelBottomBorder(15);
    expect(row).toBe("╰" + "─".repeat(13) + "╯");
    expect([...row].length).toBe(15);
  });
});

describe("formatPanelFooterRule", () => {
  test("no hints — '│─...─│'", () => {
    const row = formatPanelFooterRule(20);
    expect([...row].length).toBe(20);
    expect(row.startsWith("│")).toBe(true);
    expect(row.endsWith("│")).toBe(true);
    const middle = row.slice(1, -1);
    expect([...middle].every((c) => c === "─")).toBe(true);
  });

  test("with hints — '│ ─ <hints> ─...─│'", () => {
    const row = formatPanelFooterRule(40, "[esc] back");
    expect([...row].length).toBe(40);
    expect(row.startsWith("│ ─ [esc] back ")).toBe(true);
    expect(row.endsWith("│")).toBe(true);
  });

  test("hints longer than panel width are clipped", () => {
    const row = formatPanelFooterRule(12, "way too long for this width");
    expect([...row].length).toBe(12);
    expect(row.startsWith("│")).toBe(true);
    expect(row.endsWith("│")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/components/shell/InputPanel.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helpers + InputPanel**

```tsx
// src/components/shell/InputPanel.tsx
import React from "react";

/** Build the inner span between two corners, optionally including a labeled prefix.
 *  prefix examples: "─ Header ", " ─ hints ".
 *  Returns a string of exactly `innerWidth` characters. */
function buildLabeledRule(innerWidth: number, prefix?: string): string {
  if (innerWidth <= 0) return "";
  if (!prefix) return "─".repeat(innerWidth);
  if (prefix.length >= innerWidth) {
    // Prefix doesn't fit cleanly; truncate so output is exactly innerWidth.
    return prefix.slice(0, innerWidth);
  }
  return prefix + "─".repeat(innerWidth - prefix.length);
}

/** Top border with rounded corners. Optional header label appears as "╭─ <label> ─…─╮". */
export function formatPanelTopBorder(width: number, header?: string): string {
  if (width < 2) return "";
  const innerWidth = width - 2;
  const prefix = header ? `─ ${header} ` : undefined;
  return "╭" + buildLabeledRule(innerWidth, prefix) + "╮";
}

/** Bottom border with rounded corners. Always plain dashes. */
export function formatPanelBottomBorder(width: number): string {
  if (width < 2) return "";
  return "╰" + "─".repeat(width - 2) + "╯";
}

/** Internal footer rule (above the bottom border). The pipe characters at each end
 *  match the body-row side borders; the inner span is "─ <hints> ─…─" or all dashes. */
export function formatPanelFooterRule(width: number, hints?: string): string {
  if (width < 2) return "";
  const innerWidth = width - 2;
  const prefix = hints ? ` ─ ${hints} ` : undefined;
  return "│" + buildLabeledRule(innerWidth, prefix) + "│";
}

export type InputPanelProps = {
  /** Total panel width in characters. */
  width: number;
  /** Optional label baked into the top border. */
  header?: string;
  /** Optional hint string baked into the footer rule. Omit to skip the footer rule. */
  hints?: string;
  /** Body row(s). Each child should be a single-row element rendered with side borders. */
  children: React.ReactNode;
};

/**
 * Wrap a single body row with side borders + 1-col padding on each side.
 * Use for rows containing dynamic React elements (e.g. <input>, <span>).
 * For pure-text rows, use {@link panelTextRow} instead — it pads the string
 * to width so the right border lands at the right edge.
 */
export function PanelRow(props: { width: number; children: React.ReactNode }): React.ReactElement {
  return (
    <box flexDirection="row" width={props.width}>
      <text>│ </text>
      <box flexGrow={1}>{props.children}</box>
      <text> │</text>
    </box>
  );
}

/** Format a fully-padded panel body row from a string. Inner width = width - 4
 *  (2 borders + 1 col padding on each side). The returned string is exactly
 *  `width` characters wide. */
export function panelTextRow(width: number, content: string): string {
  if (width < 4) return "";
  const innerWidth = width - 4;
  const trimmed = [...content].slice(0, innerWidth).join("");
  const padded = trimmed + " ".repeat(Math.max(0, innerWidth - [...trimmed].length));
  return "│ " + padded + " │";
}

/** Bordered chrome for the input panel. Renders top border (with optional header),
 *  children (each child should be a row of width `width`), optional footer rule,
 *  and bottom border. */
export function InputPanel(props: InputPanelProps): React.ReactElement {
  const { width, header, hints, children } = props;
  return (
    <box flexDirection="column" flexShrink={0} width={width}>
      <text>{formatPanelTopBorder(width, header)}</text>
      {children}
      {hints !== undefined ? <text>{formatPanelFooterRule(width, hints)}</text> : null}
      <text>{formatPanelBottomBorder(width)}</text>
    </box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/components/shell/InputPanel.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/shell/InputPanel.tsx tests/components/shell/InputPanel.test.ts
git commit -m "feat(shell): add InputPanel + border format helpers"
```

---

### Task 3: Add Prompt panel mode

**Files:**
- Create: `src/components/shell/panel/Prompt.tsx`

The simplest panel mode — a single dim hint row inside the bordered chrome. No header, no footer rule.

- [ ] **Step 1: Implement Prompt**

```tsx
// src/components/shell/panel/Prompt.tsx
import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { ATTR_DIM } from "@/components/style";
import { InputPanel, panelTextRow } from "@/components/shell/InputPanel";
import { computeShellWidth } from "@/components/shell/Shell";

export type PromptProps = {
  /** Single-line hint text, e.g. "[r] reset · [esc] back". */
  hint: string;
  /** Inherit the shell's cap policy. Combat passes false. Default true. */
  capWidth?: boolean;
};

/** `prompt` panel mode: bordered box with a single dim hint row. No header, no footer rule. */
export function Prompt({ hint, capWidth = true }: PromptProps): React.ReactElement {
  const { width: termWidth } = useTerminalDimensions();
  const width = computeShellWidth(termWidth, capWidth);
  const row = panelTextRow(width, "  " + hint);
  return (
    <InputPanel width={width}>
      {React.createElement("text", null,
        React.createElement("span", { style: { attributes: ATTR_DIM } }, row),
      )}
    </InputPanel>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/panel/Prompt.tsx
git commit -m "feat(shell): add Prompt panel mode (single dim hint row)"
```

---

### Task 4: Add SceneFrame helper

**Files:**
- Create: `src/components/shell/SceneFrame.tsx`

A small helper that gives a screen's scene the centered 64-col scrollbox the existing `Screen.tsx` provides. Used by screens whose scene is just text rows; menu and combat skip it.

- [ ] **Step 1: Implement SceneFrame**

```tsx
// src/components/shell/SceneFrame.tsx
import React from "react";

/** Default inner column width for scene content, in characters. */
export const DEFAULT_SCENE_WIDTH = 64;

export type SceneFrameProps = {
  children: React.ReactNode;
  /** Inner column width. Default DEFAULT_SCENE_WIDTH. */
  width?: number;
};

/** Centered, fixed-width column wrapped in a scrollbox. Use for scene content
 *  that's just stacked text rows (selects, stats, victories). MenuScreen and
 *  CombatScreen lay out their scene directly without this wrapper. */
export function SceneFrame({ children, width = DEFAULT_SCENE_WIDTH }: SceneFrameProps): React.ReactElement {
  return (
    <scrollbox flexGrow={1}>
      <box flexDirection="column" alignItems="center">
        <box flexDirection="column" width={width}>
          {children}
        </box>
      </box>
    </scrollbox>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/SceneFrame.tsx
git commit -m "feat(shell): add SceneFrame helper (centered 64-col scrollbox)"
```

---

### Task 5: Migrate EncounterVictoryScreen to Shell (validation case)

**Files:**
- Modify: `src/screens/EncounterVictoryScreen.tsx`

Pick the simplest screen to validate the shell renders cleanly at 80×20 / 110×28 / 160×42 before migrating any others.

- [ ] **Step 1: Replace Screen wrapper with Shell + Prompt**

```tsx
// src/screens/EncounterVictoryScreen.tsx
import React, { useEffect } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { Prompt } from "@/components/shell/panel/Prompt";

export type EncounterVictoryProps = {
  monsterName: string;
  sessionNumber: number;
  killNumberInSession: number;
  onAdvance: () => void;
  onBack: () => void;
  /** Auto-advance after this many ms unless the user presses a key. Tests pass 1. */
  autoAdvanceMs?: number;
};

export function EncounterVictoryScreen(props: EncounterVictoryProps): React.ReactElement {
  const { monsterName, sessionNumber, killNumberInSession, onAdvance, onBack, autoAdvanceMs = 1500 } = props;

  useKeyboard((e: KeyEvent) => {
    if (e.name === "escape") onBack();
    else onAdvance();
  }, { global: true });

  useEffect(() => {
    const handle = setTimeout(onAdvance, autoAdvanceMs);
    return () => clearTimeout(handle);
  }, [autoAdvanceMs, onAdvance]);

  const scene = (
    <SceneFrame>
      <box flexDirection="column" gap={0}>
        <text>SLAIN</text>
        <text>─────</text>
      </box>
      <text> </text>
      <text>{monsterName}</text>
      <text>Encounter #{sessionNumber} · kill {killNumberInSession} of this session</text>
    </SceneFrame>
  );

  return (
    <Shell
      screen="victory"
      scene={scene}
      panel={<Prompt hint="any key advances · [esc] menu" />}
    />
  );
}
```

- [ ] **Step 2: Run typecheck + tests**

Run: `bun run typecheck && bun test`
Expected: all pass. The legacy `Screen.test.ts` is unaffected.

- [ ] **Step 3: Manual smoke at three sizes**

Run the dev binary in three terminal sizes (80×20, 110×28, 160×42) and trigger an encounter victory:

```bash
bun run dev
```

Manual checklist:
- 80×20: SLAIN heading + monster + session line all visible; bordered Prompt panel pinned at the bottom; auto-advance fires after 1500ms.
- 110×28: same, with comfortable breathing room above and below.
- 160×42: shell content centered (capped at 140 cols) with empty terminal margins on either side; no horizontal sprawl.

If chrome doesn't render cleanly, fix in `Shell.tsx` / `InputPanel.tsx` / `Prompt.tsx` *before* propagating the pattern. Document any regressions inline.

- [ ] **Step 4: Commit**

```bash
git add src/screens/EncounterVictoryScreen.tsx
git commit -m "feat(shell): migrate EncounterVictoryScreen to Shell + Prompt"
```

---

## Stage 2 — ChoiceList + remaining `Screen`-based migrations

### Task 6: Add ChoiceList helpers

**Files:**
- Test: `tests/components/shell/ChoiceList.test.ts`

We extract the pure helpers first — they're the only logic worth unit-testing. The component itself goes in Task 7.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/components/shell/ChoiceList.test.ts
import { describe, expect, test } from "bun:test";
import {
  navigateChoiceList,
  computeScrollWindow,
  type ChoiceItem,
} from "@/components/shell/panel/ChoiceList";

const choices: ChoiceItem[] = [
  { kind: "section", label: "Chapter 1" },
  { kind: "choice", key: "a", label: "Lump" },
  { kind: "choice", key: "b", label: "Pip" },
  { kind: "section", label: "Chapter 2" },
  { kind: "choice", key: "c", label: "Mire" },
];

describe("navigateChoiceList", () => {
  test("down from a choice skips section headings to next choice", () => {
    // currentIdx = 2 (Pip) → next choice past section heading at 3 is at 4 (Mire)
    expect(navigateChoiceList(choices, 2, "down")).toBe(4);
  });

  test("down from last choice wraps to first choice", () => {
    // currentIdx = 4 (Mire) → wraps past section at 0 to choice at 1 (Lump)
    expect(navigateChoiceList(choices, 4, "down")).toBe(1);
  });

  test("up from a choice skips section heading to previous choice", () => {
    // currentIdx = 4 (Mire) → previous choice past section at 3 is at 2 (Pip)
    expect(navigateChoiceList(choices, 4, "up")).toBe(2);
  });

  test("up from first choice wraps to last choice", () => {
    // currentIdx = 1 (Lump) → wraps past section at 0 to choice at 4 (Mire)
    expect(navigateChoiceList(choices, 1, "up")).toBe(4);
  });

  test("returns currentIdx when no choices exist", () => {
    const sectionsOnly: ChoiceItem[] = [{ kind: "section", label: "Empty" }];
    expect(navigateChoiceList(sectionsOnly, 0, "down")).toBe(0);
  });

  test("returns 0 on empty list", () => {
    expect(navigateChoiceList([], 0, "down")).toBe(0);
  });
});

describe("computeScrollWindow", () => {
  const longList: ChoiceItem[] = Array.from({ length: 12 }, (_, i) => ({
    kind: "choice" as const,
    key: String(i),
    label: `Item ${i}`,
  }));

  test("when items fit, returns full window with no boundary indicators", () => {
    const win = computeScrollWindow(longList.slice(0, 4), 0, 5);
    expect(win.startIdx).toBe(0);
    expect(win.endIdx).toBe(4);
    expect(win.moreAbove).toBe(false);
    expect(win.moreBelow).toBe(false);
  });

  test("when items overflow at top, focused row stays centered, moreBelow flagged", () => {
    const win = computeScrollWindow(longList, 2, 5);
    expect(win.startIdx).toBe(0);
    expect(win.endIdx).toBe(5);
    expect(win.moreAbove).toBe(false);
    expect(win.moreBelow).toBe(true);
  });

  test("focused row near the bottom anchors window to the end", () => {
    const win = computeScrollWindow(longList, 11, 5);
    expect(win.endIdx).toBe(12);
    expect(win.startIdx).toBe(7);
    expect(win.moreAbove).toBe(true);
    expect(win.moreBelow).toBe(false);
  });

  test("focused row in the middle centers the window", () => {
    const win = computeScrollWindow(longList, 6, 5);
    expect(win.startIdx).toBe(4);
    expect(win.endIdx).toBe(9);
    expect(win.moreAbove).toBe(true);
    expect(win.moreBelow).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/components/shell/ChoiceList.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helpers (component shell only — full component in Task 7)**

```tsx
// src/components/shell/panel/ChoiceList.tsx
import React from "react";

export type ChoiceItem =
  | { kind: "section"; label: string }
  | { kind: "choice"; key: string; label: string };

/** Move focus up or down, skipping section headings. Wraps at edges. */
export function navigateChoiceList(
  items: ReadonlyArray<ChoiceItem>,
  currentIdx: number,
  direction: "up" | "down",
): number {
  if (items.length === 0) return 0;
  if (!items.some((it) => it.kind === "choice")) return currentIdx;
  const step = direction === "down" ? 1 : -1;
  let idx = currentIdx;
  for (let i = 0; i < items.length; i++) {
    idx = (idx + step + items.length) % items.length;
    if (items[idx]?.kind === "choice") return idx;
  }
  return currentIdx;
}

export type ScrollWindow = {
  startIdx: number;
  endIdx: number;
  moreAbove: boolean;
  moreBelow: boolean;
};

/** Compute the visible slice of items given a max-row budget. The focused row
 *  is centered when possible; near edges the window anchors to that edge. */
export function computeScrollWindow(
  items: ReadonlyArray<ChoiceItem>,
  focusedIdx: number,
  maxRows: number,
): ScrollWindow {
  if (items.length <= maxRows) {
    return { startIdx: 0, endIdx: items.length, moreAbove: false, moreBelow: false };
  }
  const half = Math.floor(maxRows / 2);
  let startIdx = Math.max(0, focusedIdx - half);
  let endIdx = startIdx + maxRows;
  if (endIdx > items.length) {
    endIdx = items.length;
    startIdx = endIdx - maxRows;
  }
  return {
    startIdx,
    endIdx,
    moreAbove: startIdx > 0,
    moreBelow: endIdx < items.length,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/components/shell/ChoiceList.test.ts`
Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/panel/ChoiceList.tsx tests/components/shell/ChoiceList.test.ts
git commit -m "feat(shell): add ChoiceList navigation + scroll helpers"
```

---

### Task 7: Build the ChoiceList component

**Files:**
- Modify: `src/components/shell/panel/ChoiceList.tsx`

- [ ] **Step 1: Extend the existing file with imports + the ChoiceList component**

Add the new imports to the top of `src/components/shell/panel/ChoiceList.tsx` (alongside the existing `import React from "react"`), then append the component definition.

```tsx
// Add at the top of src/components/shell/panel/ChoiceList.tsx (with existing React import):
import { useTerminalDimensions } from "@gridland/utils";
import { ATTR_DIM } from "@/components/style";
import { InputPanel, panelTextRow } from "@/components/shell/InputPanel";
import { computeShellWidth } from "@/components/shell/Shell";

// Append to src/components/shell/panel/ChoiceList.tsx:

/** Maximum rows the choice list takes inside the panel body — half the terminal height. */
function maxBodyRows(termHeight: number): number {
  return Math.max(3, Math.floor(termHeight / 2) - 3); // 3 chrome rows: top + footer + bottom
}

export type ChoiceListProps = {
  items: ReadonlyArray<ChoiceItem>;
  focusedIdx: number;
  /** Optional panel header label. */
  header?: string;
  /** Footer hints, e.g. "[↑↓] move · [⏎] choose". */
  hints: string;
  capWidth?: boolean;
};

/** `choice` panel mode. Renders the items vertically inside the bordered panel,
 *  with the focused row marked by `▶`. Sections render as non-cursor headings.
 *  Long lists scroll inside the panel; ▲/▼ indicators appear at boundaries. */
export function ChoiceList(props: ChoiceListProps): React.ReactElement {
  const { items, focusedIdx, header, hints, capWidth = true } = props;
  const { width: termWidth, height: termHeight } = useTerminalDimensions();
  const width = computeShellWidth(termWidth, capWidth);
  const maxRows = maxBodyRows(termHeight);
  const win = computeScrollWindow(items, focusedIdx, maxRows);

  // Build rows for the visible slice. Boundary indicators replace the first/last row when active.
  const rows: string[] = [];
  for (let i = win.startIdx; i < win.endIdx; i++) {
    const item = items[i]!;
    if (i === win.startIdx && win.moreAbove) {
      rows.push(panelTextRow(width, "  ▲ more above"));
      continue;
    }
    if (i === win.endIdx - 1 && win.moreBelow) {
      rows.push(panelTextRow(width, "  ▼ more below"));
      continue;
    }
    if (item.kind === "section") {
      rows.push(panelTextRow(width, "  " + item.label));
      continue;
    }
    const cursor = i === focusedIdx ? "▶ " : "  ";
    rows.push(panelTextRow(width, cursor + item.label));
  }

  return (
    <InputPanel width={width} header={header} hints={hints}>
      {rows.map((r, i) => {
        // Section rows render dim; choice + cursor rows render at default weight.
        const visibleIdx = win.startIdx + i;
        const item = items[visibleIdx];
        const isSection = item?.kind === "section";
        const isBoundary =
          (i === 0 && win.moreAbove) || (i === rows.length - 1 && win.moreBelow);
        if (isSection || isBoundary) {
          return React.createElement("text", { key: `r:${i}` },
            React.createElement("span", { style: { attributes: ATTR_DIM } }, r),
          );
        }
        return <text key={`r:${i}`}>{r}</text>;
      })}
    </InputPanel>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/panel/ChoiceList.tsx
git commit -m "feat(shell): add ChoiceList panel mode component"
```

---

### Task 8: Migrate VictoryScreen to Shell + Prompt

**Files:**
- Modify: `src/screens/VictoryScreen.tsx`

- [ ] **Step 1: Replace Screen with Shell + Prompt**

```tsx
// src/screens/VictoryScreen.tsx
import React from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { Prompt } from "@/components/shell/panel/Prompt";

export type VictoryScreenProps = {
  monsterName: string;
  onContinue: () => void;
};

export function VictoryScreen({ monsterName, onContinue }: VictoryScreenProps): React.ReactElement {
  useKeyboard((e: KeyEvent) => {
    if (e.name === "return") onContinue();
  }, { global: true });

  const scene = (
    <SceneFrame>
      <box flexDirection="column" gap={0}>
        <text>VICTORY</text>
        <text>───────</text>
      </box>
      <text> </text>
      <text>{monsterName} has fallen.</text>
    </SceneFrame>
  );

  return (
    <Shell
      screen="victory"
      scene={scene}
      panel={<Prompt hint="[⏎] continue" />}
    />
  );
}
```

- [ ] **Step 2: Typecheck + tests**

Run: `bun run typecheck && bun test`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/screens/VictoryScreen.tsx
git commit -m "feat(shell): migrate VictoryScreen to Shell + Prompt"
```

---

### Task 9: Migrate EncounterIntroScreen to Shell + Prompt

**Files:**
- Modify: `src/screens/EncounterIntroScreen.tsx`

- [ ] **Step 1: Replace Screen with Shell + Prompt**

```tsx
// src/screens/EncounterIntroScreen.tsx
import React from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { Prompt } from "@/components/shell/panel/Prompt";

export type EncounterIntroProps = {
  onBegin: () => void;
  onBack: () => void;
};

export function EncounterIntroScreen({ onBegin, onBack }: EncounterIntroProps): React.ReactElement {
  useKeyboard((e: KeyEvent) => {
    if (e.name === "return") onBegin();
    else if (e.name === "escape") onBack();
  }, { global: true });

  const scene = (
    <SceneFrame>
      <box flexDirection="column" gap={0}>
        <text>WILD ENCOUNTER MODE</text>
        <text>───────────────────</text>
      </box>
      <text> </text>
      <text>Random monsters from the wild + story pools.</text>
      <text>Slay one and the next appears immediately.</text>
      <text>[esc] flees back to main menu.</text>
    </SceneFrame>
  );

  return (
    <Shell
      screen="encounter"
      scene={scene}
      panel={<Prompt hint="[⏎] begin · [esc] back" />}
    />
  );
}
```

- [ ] **Step 2: Typecheck + tests**

Run: `bun run typecheck && bun test`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/screens/EncounterIntroScreen.tsx
git commit -m "feat(shell): migrate EncounterIntroScreen to Shell + Prompt"
```

---

### Task 10: Migrate TutorialSelectScreen to Shell + ChoiceList

**Files:**
- Modify: `src/screens/TutorialSelectScreen.tsx`

- [ ] **Step 1: Replace Screen with Shell + ChoiceList**

```tsx
// src/screens/TutorialSelectScreen.tsx
import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { ChoiceList, navigateChoiceList, type ChoiceItem } from "@/components/shell/panel/ChoiceList";
import type { Monster } from "@/game/types";

export type TutorialSelectProps = {
  monsters: Monster[];
  onPick: (monsterId: string) => void;
  onBack: () => void;
};

export function TutorialSelectScreen({ monsters, onPick, onBack }: TutorialSelectProps): React.ReactElement {
  const items: ChoiceItem[] = monsters.map((m) => ({ kind: "choice", key: m.id, label: m.name }));
  const [idx, setIdx] = useState(0);

  useKeyboard((e: KeyEvent) => {
    if (items.length === 0) {
      if (e.name === "escape") onBack();
      return;
    }
    if (e.name === "up" || e.name === "down") {
      setIdx((i) => navigateChoiceList(items, i, e.name as "up" | "down"));
    } else if (e.name === "return") {
      const item = items[idx];
      if (item?.kind === "choice") onPick(item.key);
    } else if (e.name === "escape") onBack();
  }, { global: true });

  const scene = (
    <SceneFrame>
      <text>(tutorials are replayable; they don't track progress or feed stats)</text>
    </SceneFrame>
  );

  return (
    <Shell
      screen="tutorial"
      scene={scene}
      panel={
        <ChoiceList
          items={items}
          focusedIdx={idx}
          header="Pick a teacher"
          hints="[↑↓] move · [⏎] start · [esc] back"
        />
      }
    />
  );
}
```

- [ ] **Step 2: Typecheck + tests**

Run: `bun run typecheck && bun test`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/screens/TutorialSelectScreen.tsx
git commit -m "feat(shell): migrate TutorialSelectScreen to Shell + ChoiceList"
```

---

### Task 11: Migrate StorySelectScreen to Shell + ChoiceList

**Files:**
- Modify: `src/screens/StorySelectScreen.tsx`

The story select is the meatiest choice mode — it groups monsters by chapter using `kind: "section"` items, supports locked chapters (which render as dim section headers with no monsters), and uses the panel's scroll behavior.

- [ ] **Step 1: Replace Screen with Shell + ChoiceList**

```tsx
// src/screens/StorySelectScreen.tsx
import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { ChoiceList, navigateChoiceList, type ChoiceItem } from "@/components/shell/panel/ChoiceList";
import type { Chapter, SaveFile } from "@/game/types";

export type StorySelectProps = {
  chapters: Chapter[];
  save: SaveFile;
  onPickMonster: (chapterId: string, monsterId: string) => void;
  onBack: () => void;
};

export function isSlain(save: SaveFile, chapterId: string, monsterId: string): boolean {
  return Boolean(save.chapters[chapterId]?.monsters[monsterId]?.slainAt);
}

export function hasAnySlain(save: SaveFile, chapterId: string): boolean {
  const ms = save.chapters[chapterId]?.monsters ?? {};
  return Object.values(ms).some((m) => Boolean(m.slainAt));
}

export function isChapterUnlocked(save: SaveFile, chapters: Chapter[], ci: number): boolean {
  if (ci <= 0) return true;
  const prev = chapters[ci - 1];
  return prev ? hasAnySlain(save, prev.id) : false;
}

/** Pure builder for the choice items, exported for testing.
 *  Composite key on choices is `${chapterId}:${monsterId}` so the action handler
 *  can split it back into a chapter+monster pair. */
export function buildStoryChoiceItems(chapters: Chapter[], save: SaveFile): ChoiceItem[] {
  const items: ChoiceItem[] = [];
  chapters.forEach((c, ci) => {
    const unlocked = isChapterUnlocked(save, chapters, ci);
    const total = c.monsters.length;
    const slain = c.monsters.filter((m) => isSlain(save, c.id, m.id)).length;
    const head = unlocked ? `${c.title} — ${slain}/${total} slain` : `${c.title} (locked)`;
    items.push({ kind: "section", label: head });
    if (unlocked) {
      for (const m of c.monsters) {
        const mark = isSlain(save, c.id, m.id) ? "✓" : "·";
        items.push({ kind: "choice", key: `${c.id}:${m.id}`, label: `${mark} ${m.name}` });
      }
    }
  });
  return items;
}

export function StorySelectScreen({ chapters, save, onPickMonster, onBack }: StorySelectProps): React.ReactElement {
  const items = buildStoryChoiceItems(chapters, save);
  // Initial focus = first choice item (skip leading section).
  const firstChoiceIdx = items.findIndex((it) => it.kind === "choice");
  const [idx, setIdx] = useState(firstChoiceIdx === -1 ? 0 : firstChoiceIdx);

  useKeyboard((e: KeyEvent) => {
    if (items.length === 0) {
      if (e.name === "escape") onBack();
      return;
    }
    if (e.name === "up" || e.name === "down") {
      setIdx((i) => navigateChoiceList(items, i, e.name as "up" | "down"));
    } else if (e.name === "return") {
      const item = items[idx];
      if (item?.kind === "choice") {
        const [chapterId, monsterId] = item.key.split(":");
        if (chapterId && monsterId) onPickMonster(chapterId, monsterId);
      }
    } else if (e.name === "escape") onBack();
  }, { global: true });

  // Scene is intentionally sparse for v1 — status row already carries lifetime stats.
  const scene = <SceneFrame><text> </text></SceneFrame>;

  return (
    <Shell
      screen="story"
      scene={scene}
      panel={
        <ChoiceList
          items={items}
          focusedIdx={idx}
          header="Choose your fight"
          hints="[↑↓] move · [⏎] enter · [esc] back"
        />
      }
    />
  );
}
```

- [ ] **Step 2: Typecheck + tests**

Run: `bun run typecheck && bun test`
Expected: all pass. The existing `flattenEntries` test in this file is replaced — see Step 3.

- [ ] **Step 3: Update or remove the now-unused `flattenEntries` export and its test**

If `tests/screens/StorySelectScreen.test.ts` exists and references `flattenEntries`, replace its tests with equivalent coverage of `buildStoryChoiceItems`:

```bash
# Check if the file exists
ls tests/screens/StorySelectScreen.test.ts 2>/dev/null && echo "found" || echo "not found"
```

The existing `tests/screens/StorySelectScreen.test.ts` already covers `isSlain`, `hasAnySlain`, and `isChapterUnlocked` — those tests still pass since the helpers are unchanged. **Append** a `buildStoryChoiceItems` describe block to the existing file:

```ts
// Append to tests/screens/StorySelectScreen.test.ts
import { buildStoryChoiceItems } from "@/screens/StorySelectScreen";
// (Existing imports of Chapter / SaveFile / hasAnySlain / etc. stay.)

describe("buildStoryChoiceItems", () => {
  test("first chapter unlocked, locked chapters render as section-only rows with no monsters", () => {
    const items = buildStoryChoiceItems(chapters, emptySave);
    expect(items[0]).toEqual({ kind: "section", label: "C1 — 0/1 slain" });
    expect(items[1]).toEqual({ kind: "choice", key: "ch1:a", label: "· A" });
    expect(items[2]).toEqual({ kind: "section", label: "C2 (locked)" });
    expect(items.length).toBe(3); // locked chapter contributes no choice rows
  });

  test("slain monsters render with ✓ mark; chapter count reflects slain total", () => {
    const items = buildStoryChoiceItems(chapters, partialSave);
    expect(items[0]).toEqual({ kind: "section", label: "C1 — 1/1 slain" });
    expect(items[1]).toEqual({ kind: "choice", key: "ch1:a", label: "✓ A" });
    // c2 unlocks once any m is slain in c1
    expect(items[2]).toEqual({ kind: "section", label: "C2 — 0/1 slain" });
    expect(items[3]).toEqual({ kind: "choice", key: "ch2:b", label: "· B" });
  });
});
```

The existing `chapters`, `emptySave`, and `partialSave` fixtures at the top of the file are reused as-is — they already match the v2 `SaveFile` shape (`version: 2, createdAt, updatedAt, chapters, traitStats, encounterSessions, encounterKills, storyKills, lastMode`).

- [ ] **Step 4: Final typecheck + tests**

Run: `bun run typecheck && bun test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/StorySelectScreen.tsx tests/screens/StorySelectScreen.test.ts
git commit -m "feat(shell): migrate StorySelectScreen to Shell + ChoiceList"
```

---

### Task 12: Migrate StatsScreen to Shell + Prompt/Choice

**Files:**
- Modify: `src/screens/StatsScreen.tsx`

The default panel is a `Prompt` showing `[r] reset · [esc] back`. Pressing `r` swaps the panel to a `ChoiceList` confirm.

- [ ] **Step 1: Replace Screen with mode-swapping panel**

```tsx
// src/screens/StatsScreen.tsx
import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { Prompt } from "@/components/shell/panel/Prompt";
import { ChoiceList, navigateChoiceList, type ChoiceItem } from "@/components/shell/panel/ChoiceList";
import { TRAITS } from "@/game/traits";
import { classify, sortTraits } from "@/game/stats";
import type { SaveFile, TraitStat } from "@/game/types";
import type { Trait } from "@/game/traits";

export type StatsScreenProps = {
  save: SaveFile;
  onReset: () => void;
  onBack: () => void;
};

const TRAIT_COL = 18;

export function renderStatsRowText(trait: Trait, stat: TraitStat): string {
  const c = classify(stat);
  const total = stat.perfectStrips + stat.nonPerfectTries;
  const counts = `${stat.perfectStrips}/${total}`;
  const pct = c.rate === null ? "    " : `${Math.round(c.rate * 100).toString().padStart(3)}%`;
  return `${c.flag} ${trait.padEnd(TRAIT_COL)} ${counts.padEnd(8)} ${pct}   ${c.label}`;
}

const CONFIRM_ITEMS: ChoiceItem[] = [
  { kind: "choice", key: "no", label: "No, keep them" },
  { kind: "choice", key: "yes", label: "Yes, reset" },
];

export function StatsScreen({ save, onReset, onBack }: StatsScreenProps): React.ReactElement {
  const [confirming, setConfirming] = useState(false);
  const [confirmIdx, setConfirmIdx] = useState(0); // default to "No"

  useKeyboard((e: KeyEvent) => {
    if (confirming) {
      if (e.name === "up" || e.name === "down") {
        setConfirmIdx((i) => navigateChoiceList(CONFIRM_ITEMS, i, e.name as "up" | "down"));
      } else if (e.name === "return") {
        const item = CONFIRM_ITEMS[confirmIdx];
        setConfirming(false);
        if (item?.kind === "choice" && item.key === "yes") onReset();
      } else if (e.name === "escape") {
        setConfirming(false);
      }
      return;
    }
    if (e.name === "r") setConfirming(true);
    else if (e.name === "escape") onBack();
  }, { global: true });

  const rows = sortTraits(save.traitStats, TRAITS);
  const total = save.storyKills + save.encounterKills;

  const scene = (
    <SceneFrame>
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
    </SceneFrame>
  );

  const panel = confirming ? (
    <ChoiceList
      items={CONFIRM_ITEMS}
      focusedIdx={confirmIdx}
      header="Reset all trait stats? This cannot be undone."
      hints="[↑↓] move · [⏎] confirm · [esc] cancel"
    />
  ) : (
    <Prompt hint="[r] reset · [esc] back" />
  );

  return <Shell screen="stats" scene={scene} panel={panel} />;
}
```

- [ ] **Step 2: Typecheck + tests**

Run: `bun run typecheck && bun test`
Expected: all pass. `renderStatsRowText` is unchanged so its existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/screens/StatsScreen.tsx
git commit -m "feat(shell): migrate StatsScreen to Shell + Prompt/ChoiceList"
```

---

## Stage 3 — MenuScreen migration

### Task 13: Migrate MenuScreen to Shell + ChoiceList

**Files:**
- Modify: `src/screens/MenuScreen.tsx`

The menu's hand-laid `buildLandingRows` is split: title + monster + chapters band stay as scene content (rendered via existing string rows centered with `alignItems="center"`); the menu items move into a `ChoiceList` panel.

- [ ] **Step 1: Refactor MenuScreen**

Replace the body of `src/screens/MenuScreen.tsx` (keep the existing pure helpers `buildMenuItems`, `buildContinueLabel`, `buildChapterRows`, `navigateMenu`, the title art, and the monster art constants — they're still useful):

```tsx
// src/screens/MenuScreen.tsx
import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { ChoiceList, navigateChoiceList, type ChoiceItem } from "@/components/shell/panel/ChoiceList";
import type { SaveFile } from "@/game/types";

export type MenuChoice = "continue" | "story" | "encounter" | "tutorial" | "stats" | "quit";

export type MenuItem = { key: MenuChoice; label: string };

export const CHAPTERS: ReadonlyArray<{ id: string; short: string; total: number }> = [
  { id: "literals-anchors", short: "Literals", total: 4 },
  { id: "char-classes",     short: "Classes",  total: 4 },
  { id: "quantifiers",      short: "Quants",   total: 4 },
];

export function buildContinueLabel(lastMode: SaveFile["lastMode"]): string | null {
  if (lastMode === null) return null;
  return `Continue   (last: ${lastMode})`;
}

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

const TITLE_ART = [
  " ____  _____ ____ __  __ ____  _      _ __   _______ ____",
  "|  _ \\| ____/ ___|\\ \\/ / ___|| |    / \\\\ \\ / / ____|  _ \\",
  "| |_) |  _|| |  _  \\  /\\___ \\| |   / _ \\\\ V /|  _| | |_) |",
  "|  _ <| |__| |_| | /  \\ ___) | |__/ ___ \\| | | |___|  _ <",
  "|_| \\_\\_____\\____|/_/\\_\\____/|____/_/   \\_\\_| |_____|_| \\_\\",
];

export const MONSTER_ART = [
  "          .----.",
  "      ___/ .  . \\___",
  "     /   \\  --  /   \\",
  "     \\____\\____/____/",
  "          /_||_\\",
];

const TAGLINE = "precision is damage";
const TITLE_WIDTH    = Math.max(...TITLE_ART.map((row) => row.length));
const MONSTER_WIDTH  = Math.max(...MONSTER_ART.map((row) => row.length));
const BAND_GAP       = "    ";

function padRows(rows: string[], width: number): string[] {
  return rows.map((row) => row.padEnd(width, " "));
}

export function buildSplashRows(save: SaveFile): string[] {
  const titleRows   = padRows(TITLE_ART, TITLE_WIDTH);
  const chapterRows = buildChapterRows(save);
  const monsterRows = padRows(MONSTER_ART, MONSTER_WIDTH);
  const bandRows    = monsterRows.map((row, i) => row + BAND_GAP + (chapterRows[i] ?? ""));
  return [...titleRows, ...bandRows, TAGLINE];
}

/** Backwards-compatible nav helper kept so existing consumers/tests don't break. */
export function navigateMenu(itemCount: number, currentIdx: number, direction: "up" | "down"): number {
  if (itemCount <= 0) return 0;
  return direction === "down"
    ? (currentIdx + 1) % itemCount
    : (currentIdx + itemCount - 1) % itemCount;
}

function MenuSplash({ save }: { save: SaveFile }): React.ReactElement {
  const rows = buildSplashRows(save);
  const width = Math.max(...rows.map((row) => row.length), 0);
  return (
    <box flexDirection="column" flexGrow={1} alignItems="center">
      <box flexDirection="column" width={width}>
        {rows.map((row, i) => (
          <text key={`row:${i}`}>{row}</text>
        ))}
      </box>
    </box>
  );
}

export type MenuScreenProps = {
  save: SaveFile;
  onSelect: (choice: MenuChoice) => void;
};

export function MenuScreen({ save, onSelect }: MenuScreenProps): React.ReactElement {
  const items = buildMenuItems(save);
  const choiceItems: ChoiceItem[] = items.map((it) => ({ kind: "choice", key: it.key, label: it.label }));
  const [idx, setIdx] = useState(0);

  useKeyboard((e: KeyEvent) => {
    if (e.name === "up" || e.name === "down") {
      setIdx((i) => navigateChoiceList(choiceItems, i, e.name as "up" | "down"));
    } else if (e.name === "return") {
      const item = items[idx];
      if (item) onSelect(item.key);
    } else if (e.name === "q") {
      onSelect("quit");
    }
  }, { global: true });

  return (
    <Shell
      screen="menu"
      scene={<MenuSplash save={save} />}
      panel={
        <ChoiceList
          items={choiceItems}
          focusedIdx={idx}
          hints="[↑↓] move · [⏎] choose · [q] quit"
        />
      }
    />
  );
}
```

- [ ] **Step 2: Update `tests/screens/MenuScreen.test.ts`**

The existing test file imports `buildLandingRows`, `buildMenuRows`, `buildBottomLine` — none of those exist after Task 13's refactor. Apply these specific changes:

**Update the import line:**

```ts
// Before:
import { buildLandingRows, buildMenuItems, buildMenuRows, navigateMenu, CHAPTERS, buildContinueLabel, buildChapterRows, buildBottomLine, MONSTER_ART } from "@/screens/MenuScreen";
// After:
import { buildSplashRows, buildMenuItems, navigateMenu, CHAPTERS, buildContinueLabel, buildChapterRows, MONSTER_ART } from "@/screens/MenuScreen";
```

**Replace the entire `describe("buildLandingRows", ...)` block** (the splash now excludes the menu list and the bottom line — those moved to the panel/status):

```ts
describe("buildSplashRows", () => {
  test("renders title art, monster band, chapter box, and tagline", () => {
    const rows = buildSplashRows(empty);
    expect(rows.some((row) => row.includes("____  _____"))).toBe(true);
    expect(rows.some((row) => row.includes(".----."))).toBe(true);
    expect(rows.some((row) => row.includes("┌─ chapters"))).toBe(true);
    expect(rows.map((row) => row.trim())).toContain("precision is damage");
  });

  test("monster band joins monster art with chapter box row-for-row", () => {
    const rows = buildSplashRows(empty);
    const bandRow = rows.find((row) => row.includes(".----.") && row.includes("┌─ chapters"));
    expect(bandRow).toBeDefined();
  });

  test("monster art and chapter box have matching row counts (band drift guard)", () => {
    expect(MONSTER_ART.length).toBe(buildChapterRows(empty).length);
  });

  test("excludes the menu list and lifetime stats (now in panel + StatusBar)", () => {
    const save: SaveFile = { ...empty, lastMode: "story", storyKills: 5 };
    const rows = buildSplashRows(save);
    expect(rows.some((row) => row.includes("Continue"))).toBe(false);
    expect(rows.some((row) => row.includes("▶ Story"))).toBe(false);
    expect(rows.some((row) => row.includes("5 slain"))).toBe(false);
    expect(rows.some((row) => row.includes("[↑↓] move"))).toBe(false);
  });

  test("keeps every splash row within the minimum terminal width", () => {
    const rows = buildSplashRows({ ...empty, lastMode: "story" });
    expect(Math.max(...rows.map((row) => row.length))).toBeLessThanOrEqual(76);
  });
});
```

**Delete the entire `describe("buildMenuRows", ...)` block** — the menu list is now rendered by `ChoiceList`, not a pure helper.

**Delete the entire `describe("buildBottomLine", ...)` block** — the bottom line is now the `ChoiceList`'s footer hints (a fixed string, not a pure helper) and lifetime stats live in the StatusBar.

The remaining test blocks (`buildMenuItems`, `navigateMenu`, `buildContinueLabel`, `CHAPTERS`, `buildChapterRows`, `buildMenuItems with lastMode`) stay green unchanged.

- [ ] **Step 3: Typecheck + full test pass**

Run: `bun run typecheck && bun test`
Expected: all pass.

- [ ] **Step 4: Manual smoke**

```bash
bun run dev
```

Confirm at 80×20 that the title art + monster + chapters band fit above the panel + status row. With "Continue" item present (so panel has 6 rows), expect the splash to lose ~1 row of breathing room — acceptable per spec §5.1.

- [ ] **Step 5: Commit**

```bash
git add src/screens/MenuScreen.tsx tests/screens/MenuScreen.test.ts 2>/dev/null
git commit -m "feat(shell): migrate MenuScreen to Shell + ChoiceList"
```

---

## Stage 4 — CombatScreen migration

### Task 14: Add TextInput panel mode

**Files:**
- Create: `src/components/shell/panel/TextInput.tsx`

The combat regex input + numeric/symbolic feedback + optional invalid warning + optional sparks, all inside the bordered panel.

- [ ] **Step 1: Implement TextInput**

```tsx
// src/components/shell/panel/TextInput.tsx
import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { InputPanel, PanelRow, panelTextRow } from "@/components/shell/InputPanel";
import { computeShellWidth } from "@/components/shell/Shell";
import { FeedbackLine } from "@/components/FeedbackLine";
import { HeartSparks } from "@/components/HeartSparks";

export type TextInputProps = {
  pattern: string;
  onPatternChange: (next: string) => void;
  vitalsHit: number;
  vitalsTotal: number;
  collateral: number;
  damage: number;
  invalid?: string;
  hints: string;
  capWidth?: boolean;
  /** Pass `true` during heart phase to enable per-keystroke spark effects. */
  sparksActive?: boolean;
  /** Used by HeartSparks to detect keystroke trigger points. */
  sparksTrigger?: number;
};

/** `text` panel mode: regex input row + feedback rows + optional invalid + optional sparks.
 *  Used by CombatScreen during the typing/heart phase. */
export function TextInput(props: TextInputProps): React.ReactElement {
  const { width: termWidth } = useTerminalDimensions();
  const width = computeShellWidth(termWidth, props.capWidth ?? false);

  // Input row: literal "› " followed by the gridland <input> stretched to fill.
  const inputRow = (
    <PanelRow width={width}>
      <box flexDirection="row" gap={1} width="100%">
        <text>›</text>
        <box flexGrow={1}>
          {React.createElement("input", {
            value: props.pattern,
            focused: true,
            onInput: props.onPatternChange,
            maxLength: 256,
            width: "100%",
          })}
        </box>
      </box>
    </PanelRow>
  );

  return (
    <InputPanel width={width} hints={props.hints}>
      {inputRow}
      {props.invalid ? <text>{panelTextRow(width, "  ⚠ " + props.invalid)}</text> : null}
      <PanelRow width={width}>
        <FeedbackLine
          vitalsHit={props.vitalsHit}
          vitalsTotal={props.vitalsTotal}
          collateral={props.collateral}
          damage={props.damage}
        />
      </PanelRow>
      {props.sparksActive && props.sparksTrigger !== undefined ? (
        <PanelRow width={width}>
          <HeartSparks trigger={props.sparksTrigger} active={props.sparksActive} />
        </PanelRow>
      ) : null}
    </InputPanel>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/panel/TextInput.tsx
git commit -m "feat(shell): add TextInput panel mode (regex input + feedback)"
```

---

### Task 15: Add BannerSlot + Cheatsheet panel modes

**Files:**
- Create: `src/components/shell/panel/BannerSlot.tsx`
- Create: `src/components/shell/panel/Cheatsheet.tsx`

- [ ] **Step 1: Implement BannerSlot**

```tsx
// src/components/shell/panel/BannerSlot.tsx
import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { InputPanel, PanelRow } from "@/components/shell/InputPanel";
import { computeShellWidth } from "@/components/shell/Shell";
import { ShimmerBanner } from "@/components/ShimmerBanner";

export type BannerSlotProps = {
  headline: string;
  peakColor: string;
  durationMs: number;
  footnoteLabel: string;
  footnoteValue: string;
  capWidth?: boolean;
};

/** `banner` panel mode: hosts the existing ShimmerBanner inside the bordered panel.
 *  Used by CombatScreen during strip / kill phases. */
export function BannerSlot(props: BannerSlotProps): React.ReactElement {
  const { width: termWidth } = useTerminalDimensions();
  const width = computeShellWidth(termWidth, props.capWidth ?? false);
  return (
    <InputPanel width={width}>
      <PanelRow width={width}>
        <ShimmerBanner
          headline={props.headline}
          peakColor={props.peakColor}
          durationMs={props.durationMs}
          footnoteLabel={props.footnoteLabel}
          footnoteValue={props.footnoteValue}
        />
      </PanelRow>
    </InputPanel>
  );
}
```

- [ ] **Step 2: Implement Cheatsheet**

```tsx
// src/components/shell/panel/Cheatsheet.tsx
import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { InputPanel, panelTextRow } from "@/components/shell/InputPanel";
import { computeShellWidth } from "@/components/shell/Shell";

export type CheatsheetProps = {
  /** Chapter title — appears in the panel header as "<title> · cheatsheet". */
  chapterTitle: string;
  /** Cheatsheet rows from the chapter content. */
  lines: ReadonlyArray<string>;
  /** Footer hint, e.g. "[tab] back to combat". */
  hints: string;
  capWidth?: boolean;
};

/** `cheatsheet` panel mode: displays chapter regex hints. Toggle in/out via tab. */
export function Cheatsheet(props: CheatsheetProps): React.ReactElement {
  const { width: termWidth } = useTerminalDimensions();
  const width = computeShellWidth(termWidth, props.capWidth ?? false);
  return (
    <InputPanel
      width={width}
      header={`${props.chapterTitle} · cheatsheet`}
      hints={props.hints}
    >
      {props.lines.map((line, i) => (
        <text key={`cheat:${i}`}>{panelTextRow(width, "  " + line)}</text>
      ))}
    </InputPanel>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/shell/panel/BannerSlot.tsx src/components/shell/panel/Cheatsheet.tsx
git commit -m "feat(shell): add BannerSlot + Cheatsheet panel modes"
```

---

### Task 16: Migrate CombatScreen to Shell

**Files:**
- Modify: `src/screens/CombatScreen.tsx`

Combat is the most invasive migration. The existing two-column scene (28-col side rail + body view) stays as the scene content. The current right-column composition (banner / hint overlay / input + feedback + sparks) moves into the panel, swapped by phase.

- [ ] **Step 1: Rewrite CombatScreen as a router**

```tsx
// src/screens/CombatScreen.tsx
import React, { useState, useEffect } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { BodyView } from "@/components/BodyView";
import { HpBar } from "@/components/HpBar";
import { LayerRoadmap } from "@/components/LayerRoadmap";
import { MonsterPortrait } from "@/components/MonsterPortrait";
import { POSITIVE_COLOR, DANGER_COLOR } from "@/components/style";
import { Shell } from "@/components/shell/Shell";
import { Prompt } from "@/components/shell/panel/Prompt";
import { TextInput } from "@/components/shell/panel/TextInput";
import { BannerSlot } from "@/components/shell/panel/BannerSlot";
import { Cheatsheet } from "@/components/shell/panel/Cheatsheet";
import {
  useCombatEngine,
  BANNER_DURATION_MS,
  type TraitEvent,
} from "@/components/hooks/useCombatEngine";
import type { Chapter, Monster, BestRegex, SaveMode } from "@/game/types";

export type CombatScreenProps = {
  chapter: Chapter;
  monster: Monster;
  mode: SaveMode;
  onKill: (bestRegexes: Record<string, BestRegex>) => void;
  onFlee: () => void;
  onTraitEvent?: (e: TraitEvent) => void;
};

function CombatSideRail(props: {
  chapterTitle: string;
  monster: Monster;
  hpPercent: number;
  activeIdx: number;
  strippedIdxs: number[];
  inHeart: boolean;
}): React.ReactElement {
  return (
    <box flexDirection="column" padding={1} width={28} gap={1}>
      <text>{props.chapterTitle}</text>
      <MonsterPortrait name={props.monster.portrait} />
      <text>{props.monster.name}</text>
      <HpBar percent={props.hpPercent} max={100} />
      <LayerRoadmap
        topics={props.monster.layers.map((l) => l.topic)}
        activeIdx={props.activeIdx}
        strippedIdxs={props.strippedIdxs}
        inHeart={props.inHeart}
      />
    </box>
  );
}

export function CombatScreen(props: CombatScreenProps): React.ReactElement {
  const { chapter, monster, mode, onKill, onFlee, onTraitEvent } = props;
  const engine = useCombatEngine({ monster, onTraitEvent });
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (engine.state.phase.kind !== "kill") return;
    const timer = setTimeout(() => onKill(engine.state.bestRegexes), BANNER_DURATION_MS);
    return () => clearTimeout(timer);
  }, [engine.state.phase, engine.state.bestRegexes, onKill]);

  useKeyboard((e: KeyEvent) => {
    if (engine.state.phase.kind === "intro" && e.name === "return") {
      engine.dismissIntro();
      return;
    }
    if (e.name === "tab") {
      setHintOpen((v) => !v);
      e.preventDefault();
      return;
    }
    if (e.name === "escape") {
      if (hintOpen) setHintOpen(false);
      else onFlee();
    }
  }, { global: true });

  const totalLayers = monster.layers.length;
  const heartProgress = engine.state.phase.kind === "heart" || engine.state.phase.kind === "kill" ? 1 : 0;
  const progressPercent = ((engine.state.layersStripped.length + heartProgress) / (totalLayers + 1)) * 100;
  const hpPercent = 100 - progressPercent;
  const inHeart = engine.state.phase.kind === "heart" || engine.state.phase.kind === "kill";
  const activeIdx =
    engine.state.phase.kind === "layerActive" ? engine.state.phase.layerIdx :
    engine.state.phase.kind === "strip"        ? engine.state.phase.layerIdx :
    Math.max(0, totalLayers - 1);
  const isTutorial = mode === "tutorial";
  const layerCoaching =
    isTutorial && engine.state.phase.kind === "layerActive"
      ? monster.layers[engine.state.phase.layerIdx]?.coaching
      : undefined;

  // Intro phase: simple centered scene + Prompt panel.
  if (engine.state.phase.kind === "intro") {
    const introScene = (
      <box flexDirection="column" flexGrow={1} padding={2} gap={1} alignItems="center">
        <MonsterPortrait name={monster.portrait} />
        <text>{monster.name}</text>
        <text>{monster.flavor}</text>
        {isTutorial && monster.coaching ? <text>{monster.coaching}</text> : null}
      </box>
    );
    return (
      <Shell
        screen="combat"
        capWidth={false}
        scene={introScene}
        panel={<Prompt hint="[⏎] begin · [esc] flee" />}
      />
    );
  }

  // Active phase scene: side rail + body view, no input chrome (that's in the panel).
  const scene = (
    <box flexDirection="row" flexGrow={1}>
      <CombatSideRail
        chapterTitle={chapter.title}
        monster={monster}
        hpPercent={hpPercent}
        activeIdx={activeIdx}
        strippedIdxs={engine.state.layersStripped}
        inHeart={inHeart}
      />
      <box flexDirection="column" flexGrow={1} padding={1} gap={1}>
        {layerCoaching ? <text>→ {layerCoaching}</text> : null}
        <BodyView
          monster={monster}
          activeLayerIdx={activeIdx}
          strippedIdxs={engine.state.layersStripped}
          inHeart={inHeart}
          matchedKeys={engine.evalResult?.matchedLineKeys ?? new Set<string>()}
          matchedRanges={engine.evalResult?.matchedRanges}
          heartKilled={engine.state.phase.kind === "kill"}
        />
      </box>
    </box>
  );

  // Pick the panel mode based on phase + hint toggle.
  let panel: React.ReactElement;
  if (engine.state.phase.kind === "kill") {
    panel = (
      <BannerSlot
        headline="✦ ✦ ✦  SLAIN  ✦ ✦ ✦"
        peakColor={DANGER_COLOR}
        durationMs={BANNER_DURATION_MS}
        footnoteLabel="killed by:"
        footnoteValue={engine.state.bestRegexes["heart"]?.pattern ?? engine.pattern}
      />
    );
  } else if (engine.state.phase.kind === "strip") {
    panel = (
      <BannerSlot
        headline={`✓  LAYER STRIPPED — ${monster.layers[engine.state.phase.layerIdx]?.topic ?? ""}`}
        peakColor={POSITIVE_COLOR}
        durationMs={BANNER_DURATION_MS}
        footnoteLabel="matched by:"
        footnoteValue={engine.state.bestRegexes[String(engine.state.phase.layerIdx)]?.pattern ?? engine.pattern}
      />
    );
  } else if (hintOpen) {
    panel = (
      <Cheatsheet
        chapterTitle={chapter.title}
        lines={chapter.cheatsheet}
        hints="[tab] back to combat"
      />
    );
  } else {
    panel = (
      <TextInput
        pattern={engine.pattern}
        onPatternChange={(p) => engine.setPattern(p)}
        vitalsHit={engine.evalResult?.vitalsHit ?? 0}
        vitalsTotal={engine.evalResult?.vitalsTotal ?? 0}
        collateral={engine.evalResult?.collateral ?? 0}
        damage={engine.damage}
        invalid={engine.evalResult?.invalid}
        hints="[tab] hint · [esc] flee"
        sparksActive={engine.state.phase.kind === "heart"}
        sparksTrigger={engine.pattern.length}
      />
    );
  }

  return <Shell screen="combat" capWidth={false} scene={scene} panel={panel} />;
}
```

- [ ] **Step 2: Typecheck + full test pass**

Run: `bun run typecheck && bun test`
Expected: all pass. Existing combat tests (`useCombatEngine`, `damage`, `matcher`, `BodyView`, etc.) are unaffected.

- [ ] **Step 3: Manual smoke through every combat phase**

```bash
bun run dev
```

Trigger each phase and verify the panel renders:

- **Intro phase** — portrait + name + flavor in scene; Prompt `[⏎] begin · [esc] flee` at the bottom.
- **Typing phase** — body view + side rail in scene; TextInput panel with regex input, feedback rows, footer `[tab] hint · [esc] flee`.
- **Tab toggle** — Cheatsheet panel replaces TextInput; tab again restores TextInput.
- **Layer strip** — body view shows the stripped layer dimmed/strikethrough; ShimmerBanner shows `✓ LAYER STRIPPED — <topic>` inside the panel for ~1500ms; returns to TextInput.
- **Heart phase** — body view shows the heart row with `♦` gutter; HeartSparks fires under the feedback rows on each keystroke.
- **Kill phase** — body view shows heart killed (green strikethrough); SLAIN ShimmerBanner inside the panel for ~1500ms; transitions to victory screen.

Verify at 80×20 that the body view + side rail still fit with the panel's new height.

- [ ] **Step 4: Commit**

```bash
git add src/screens/CombatScreen.tsx
git commit -m "feat(shell): migrate CombatScreen to Shell with phase-driven panel modes"
```

---

## Stage 5 — Cleanup

### Task 17: Drop the legacy `Screen.tsx` + StatusBar hint row

**Files:**
- Delete: `src/components/Screen.tsx`, `tests/components/Screen.test.ts`
- Modify: `src/components/StatusBar.tsx`, `tests/components/StatusBar.test.ts`

Every screen now uses `<Shell>` (with `<SceneFrame>` for screens whose scene needs the centered column). The legacy `Screen` component and the StatusBar hint row are unused.

- [ ] **Step 1: Confirm no remaining Screen.tsx imports**

Run: `grep -rn "from \"@/components/Screen\"" src/ tests/ || echo "clean"`
Expected: `clean`.

If any import remains, finish migrating it before continuing.

- [ ] **Step 2: Delete legacy files**

```bash
rm src/components/Screen.tsx tests/components/Screen.test.ts
```

- [ ] **Step 3: Drop the hint row from StatusBar**

```tsx
// src/components/StatusBar.tsx
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
  if (brand.length <= width) return brand + "─".repeat(width - brand.length);
  return brand.slice(0, width);
}

export type StatusBarProps = {
  screen: string;
};

/** Single-row status: brand · screen · slain · sessions, dashes filling the rest.
 *  No hint row — hints live in the input panel footer. */
export function StatusBar({ screen }: StatusBarProps): React.ReactElement {
  const { width } = useTerminalDimensions();
  const { slain, sessions } = useSaveLifetime();
  return <text>{formatStatusInfoRow(BRAND, screen, slain, sessions, width)}</text>;
}
```

- [ ] **Step 4: Drop the formatStatusHintRow tests**

Remove the `formatStatusHintRow` describe block from `tests/components/StatusBar.test.ts`. The remaining tests cover `formatStatusInfoRow` and the `BRAND` constant — both unchanged.

```ts
// Delete the import of formatStatusHintRow:
import { formatStatusInfoRow, BRAND } from "@/components/StatusBar";

// Delete the entire `describe("formatStatusHintRow", ...)` block.
```

- [ ] **Step 5: Confirm no callers of the dropped helper**

Run: `grep -rn "formatStatusHintRow" src/ tests/ || echo "clean"`
Expected: `clean`.

If anything still imports it, switch that caller to the panel's footer hint or simply drop the call.

- [ ] **Step 6: Confirm no callers of the old `<StatusBar hints={...}>` prop**

Run: `grep -rn "StatusBar" src/ tests/ | grep -v node_modules`
Expected: only the StatusBar definition + Shell.tsx using `formatStatusInfoRow`. No JSX usage of `<StatusBar hints=...>`.

- [ ] **Step 7: Final typecheck + tests**

Run: `bun run typecheck && bun test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add -u
git commit -m "chore(shell): remove legacy Screen component and StatusBar hint row"
```

---

## Self-Review Checklist (run before declaring done)

After all tasks are complete, walk the spec sections and confirm:

- [ ] §2.1 Scene — combat, menu, and the others render scene content via `<Shell scene={...}>`. None embed input affordances in the scene.
- [ ] §2.2 Status row — single row, hint row gone (Task 17).
- [ ] §2.3 Input panel — bordered with rounded corners, optional header + hints (Task 2).
- [ ] §3.1 `text` mode — covered by Task 14, used by combat typing (Task 16).
- [ ] §3.2 `choice` mode — covered by Tasks 6+7, used by Menu (Task 13), TutorialSelect (Task 10), StorySelect (Task 11), Stats confirm (Task 12).
- [ ] §3.3 `prompt` mode — covered by Task 3, used by EncounterVictory (Task 5), Victory (Task 8), EncounterIntro (Task 9), Stats default (Task 12), Combat intro (Task 16).
- [ ] §3.4 `banner` mode — covered by Task 15, used by Combat strip + kill (Task 16).
- [ ] §3.5 `cheatsheet` mode — covered by Task 15, used by Combat tab toggle (Task 16).
- [ ] §4 Per-screen mapping table — every row has a corresponding migration task.
- [ ] §5 Responsive — `computeShellWidth` test covers 80/140/141/200; combat passes `capWidth=false` (Task 16).
- [ ] §7 Migration plan — Stage 1 (1–5), Stage 2 (6–12), Stage 3 (13), Stage 4 (14–16), Stage 5 (17).
- [ ] §8 Tests — Shell.test.ts (Task 1), InputPanel.test.ts (Task 2), ChoiceList.test.ts (Task 6). `formatStatusHintRow` test deleted in Task 17.
