# regxslayer v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the v1 terminal regex-practice game described in `docs/superpowers/specs/2026-05-04-regxslayer-design.md` — 3 chapters × 4 monsters, layered live-filter combat, vital-string heart kill, local save, single binary.

**Architecture:** Pure TypeScript game logic (`src/game/`) wraps in a gridland (React + OpenTUI on Bun) UI. Content is typed TS data (`src/content/`). Stateful UI hooks (`src/components/hooks/`) bridge the two. Top-level `src/app.tsx` is a router; `src/cli.tsx` mounts.

**Tech Stack:** Bun (runtime + bundler + test runner), gridland (`@gridland/bun`, `@gridland/utils`, `@gridland/ui`, `@gridland/testing`), React 19, TypeScript.

**Spec reference:** `docs/superpowers/specs/2026-05-04-regxslayer-design.md` — every section number below cited as **(spec §N)** points to this file.

---

## Conventions used in this plan

- All paths are relative to repo root `/Users/victor/Documents/Workspace/Projects/regxslayer`.
- Every code step shows the full file content. Replace any earlier version of that file entirely.
- `bun test` runs Bun's built-in Jest-like runner.
- Commits use Conventional Commits (`feat:`, `chore:`, `test:`, `docs:`, `fix:`).
- Always commit at the end of each task. Frequent commits = easy bisect.
- After each task, the build (`bun test` and where applicable `bun build`) MUST be green before commit.

---

# Phase 0 — Project bootstrap

## Task 0: Initialize Bun project, install gridland, scaffold tsconfig

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `bunfig.toml`
- Create: `src/cli.tsx`
- Create: `src/app.tsx`

- [ ] **Step 1: Initialize package.json**

Create `package.json`:

```json
{
  "name": "regxslayer",
  "version": "0.1.0",
  "description": "Terminal regex-practice game",
  "type": "module",
  "main": "src/cli.tsx",
  "bin": {
    "regxslayer": "src/cli.tsx"
  },
  "scripts": {
    "dev": "bun run src/cli.tsx",
    "test": "bun test",
    "validate-content": "bun run scripts/validate-content.ts",
    "build": "bun run scripts/validate-content.ts && bun build --compile src/cli.tsx --outfile dist/regxslayer",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@gridland/bun": "latest",
    "@gridland/utils": "latest",
    "@gridland/ui": "latest",
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@gridland/testing": "latest",
    "@types/react": "^19.0.0",
    "@types/bun": "latest",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "resolveJsonModule": true,
    "types": ["bun-types"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*", "scripts/**/*"]
}
```

- [ ] **Step 3: Create bunfig.toml**

```toml
[install]
exact = false

[test]
preload = []
coverage = false
```

- [ ] **Step 4: Install dependencies**

Run: `bun install`
Expected: dependencies installed, `bun.lockb` created.

- [ ] **Step 5: Create src/app.tsx as a placeholder**

```tsx
import React from "react";

export function App(): React.ReactElement {
  return (
    <box flexDirection="column" padding={1}>
      <text>regxslayer — placeholder</text>
    </box>
  );
}
```

- [ ] **Step 6: Create src/cli.tsx that mounts the app**

```tsx
#!/usr/bin/env bun
import React from "react";
import { createCliRenderer, createRoot } from "@gridland/bun";
import { App } from "./app";

async function main(): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  const root = createRoot(renderer);
  root.render(<App />);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 7: Smoke run**

Run: `bun run src/cli.tsx`
Expected: terminal alternate-screen mode shows "regxslayer — placeholder". Press Ctrl-C to exit.

If `createCliRenderer` / `createRoot` exports do not exist with these exact names, run `bun pm ls @gridland/bun` and inspect `node_modules/@gridland/bun/dist/index.d.ts` to find the actual exported names; update the imports in `src/cli.tsx`. The same intrinsic JSX tags (`box`, `text`) should still be valid.

- [ ] **Step 8: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json bunfig.toml bun.lockb src/cli.tsx src/app.tsx
git commit -m "chore: bootstrap bun + gridland scaffold

- bun project with @gridland/bun, @gridland/utils, @gridland/ui, @gridland/testing
- minimal cli.tsx mounts a placeholder App
- tsconfig with strict + noUncheckedIndexedAccess"
```

---

# Phase 1 — Pure game logic (TDD)

This phase delivers all the testable game mechanics with no React. Every task is test-first.

## Task 1: Game types

**Files:**
- Create: `src/game/types.ts`

- [ ] **Step 1: Create the types module**

```ts
// src/game/types.ts

export type Line = {
  text: string;
  vital: boolean;
};

export type Layer = {
  topic: string;
  lines: Line[];
};

export type Monster = {
  id: string;
  name: string;
  portrait: string;          // key into src/content/portraits.ts
  flavor: string;
  layers: Layer[];           // peeled in order
  heart: { text: string };   // single vital string
};

export type Chapter = {
  id: string;
  title: string;
  intro: string;
  cheatsheet: string[];      // shown on `?`
  monsters: Monster[];
};

export type EvalResult = {
  vitalsHit: number;
  vitalsTotal: number;
  collateral: number;
  perfect: boolean;
  invalid?: string;
  /** Per-line match map, keyed by `${layerIdx}:${lineIdx}` for the body view. Heart entries use `heart`. */
  matchedLineKeys: ReadonlySet<string>;
};

export type CombatPhase =
  | { kind: "intro" }
  | { kind: "layerActive"; layerIdx: number }
  | { kind: "strip"; layerIdx: number }
  | { kind: "heart" }
  | { kind: "kill" };

export type BestRegex = {
  pattern: string;
  length: number;
};

export type MonsterRecord = {
  slainAt: string;
  bestRegexes: Record<string, BestRegex>;  // keys: "0", "1", ..., "heart"
};

export type SaveFile = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  chapters: Record<string, { monsters: Record<string, MonsterRecord> }>;
};
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(game): add core type definitions"
```

---

## Task 2: Matcher (regex compile + per-line evaluation)

**Files:**
- Create: `tests/game/matcher.test.ts`
- Create: `src/game/matcher.ts`

Spec ref: §5.2, §5.5.

- [ ] **Step 1: Write the failing tests**

Create `tests/game/matcher.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { evaluate } from "@/game/matcher";
import type { Monster } from "@/game/types";

const monster: Monster = {
  id: "m",
  name: "Test",
  portrait: "x",
  flavor: "",
  layers: [
    {
      topic: "literals",
      lines: [
        { text: "alpha", vital: true },
        { text: "beta",  vital: true },
        { text: "noise", vital: false },
      ],
    },
    {
      topic: "more",
      lines: [
        { text: "gamma", vital: true },
        { text: "delta", vital: false },
      ],
    },
  ],
  heart: { text: "HEART_TOKEN" },
};

describe("evaluate — layer phase", () => {
  test("empty pattern matches nothing", () => {
    const r = evaluate({ pattern: "", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.vitalsHit).toBe(0);
    expect(r.collateral).toBe(0);
    expect(r.perfect).toBe(false);
  });

  test("perfect match — both vitals, no filler, no locked", () => {
    const r = evaluate({ pattern: "^(alpha|beta)$", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.vitalsHit).toBe(2);
    expect(r.vitalsTotal).toBe(2);
    expect(r.collateral).toBe(0);
    expect(r.perfect).toBe(true);
  });

  test("partial vitals — no perfect", () => {
    const r = evaluate({ pattern: "^alpha$", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.vitalsHit).toBe(1);
    expect(r.perfect).toBe(false);
  });

  test("collateral from active filler counts and blocks perfect", () => {
    const r = evaluate({ pattern: ".+", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.vitalsHit).toBe(2);
    expect(r.collateral).toBeGreaterThanOrEqual(1); // at least the "noise" line
    expect(r.perfect).toBe(false);
  });

  test("matches in locked (future) layers count as collateral", () => {
    const r = evaluate({ pattern: "^(alpha|beta|gamma)$", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.vitalsHit).toBe(2);
    expect(r.collateral).toBeGreaterThanOrEqual(1); // gamma is in locked layer 1
    expect(r.perfect).toBe(false);
  });

  test("invalid regex returns invalid string and no matches", () => {
    const r = evaluate({ pattern: "(", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.invalid).toBeTruthy();
    expect(r.vitalsHit).toBe(0);
    expect(r.collateral).toBe(0);
  });

  test("matchedLineKeys identifies which lines matched", () => {
    const r = evaluate({ pattern: "^alpha$", monster, phase: { kind: "layerActive", layerIdx: 0 } });
    expect(r.matchedLineKeys.has("0:0")).toBe(true);
    expect(r.matchedLineKeys.has("0:1")).toBe(false);
  });
});

describe("evaluate — heart phase", () => {
  test("perfect heart match", () => {
    const r = evaluate({ pattern: "^HEART_TOKEN$", monster, phase: { kind: "heart" } });
    expect(r.vitalsHit).toBe(1);
    expect(r.vitalsTotal).toBe(1);
    expect(r.perfect).toBe(true);
    expect(r.matchedLineKeys.has("heart")).toBe(true);
  });

  test("matching the heart but also other lines = not perfect", () => {
    const r = evaluate({ pattern: ".+", monster, phase: { kind: "heart" } });
    expect(r.vitalsHit).toBe(1);
    expect(r.collateral).toBeGreaterThan(0);
    expect(r.perfect).toBe(false);
  });
});

describe("evaluate — slow pattern guard", () => {
  test("catastrophic-backtracking pattern aborts within budget", () => {
    const evil = "(a+)+$";
    const slow: Monster = {
      ...monster,
      layers: [{ topic: "x", lines: [{ text: "a".repeat(30) + "X", vital: true }] }],
      heart: { text: "z" },
    };
    const r = evaluate({ pattern: evil, monster: slow, phase: { kind: "layerActive", layerIdx: 0 }, budgetMs: 50 });
    expect(r.invalid).toBe("slow");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/game/matcher.test.ts`
Expected: all tests FAIL with "Cannot find module '@/game/matcher'".

- [ ] **Step 3: Implement the matcher**

Create `src/game/matcher.ts`:

```ts
import type { CombatPhase, EvalResult, Monster } from "./types";

export type EvaluateInput = {
  pattern: string;
  monster: Monster;
  phase: CombatPhase;
  /** Wall-clock budget per evaluation. Default 50ms. */
  budgetMs?: number;
};

const EMPTY: EvalResult = {
  vitalsHit: 0,
  vitalsTotal: 0,
  collateral: 0,
  perfect: false,
  matchedLineKeys: new Set(),
};

export function evaluate(input: EvaluateInput): EvalResult {
  const { pattern, monster, phase, budgetMs = 50 } = input;

  if (pattern === "") {
    return withTotals(EMPTY, monster, phase);
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, "u");
  } catch (err) {
    return { ...withTotals(EMPTY, monster, phase), invalid: (err as Error).message };
  }

  const matched = new Set<string>();
  const start = performance.now();

  // Active layer (layerActive only) and locked layers
  const isLayerPhase = phase.kind === "layerActive";
  const isHeartPhase = phase.kind === "heart";

  // Iterate every layer + heart, marking matches and aborting if budget exceeded.
  for (let li = 0; li < monster.layers.length; li++) {
    const layer = monster.layers[li]!;
    for (let i = 0; i < layer.lines.length; i++) {
      const line = layer.lines[i]!;
      if (performance.now() - start > budgetMs) {
        return { ...withTotals(EMPTY, monster, phase), invalid: "slow" };
      }
      if (testRegex(regex, line.text)) {
        matched.add(`${li}:${i}`);
      }
    }
  }
  if (testRegex(regex, monster.heart.text)) {
    matched.add("heart");
  }

  // Compute counts based on phase
  let vitalsHit = 0;
  let vitalsTotal = 0;
  let collateral = 0;

  if (isLayerPhase) {
    const activeIdx = phase.layerIdx;
    const active = monster.layers[activeIdx]!;
    for (let i = 0; i < active.lines.length; i++) {
      const line = active.lines[i]!;
      const key = `${activeIdx}:${i}`;
      if (line.vital) {
        vitalsTotal++;
        if (matched.has(key)) vitalsHit++;
      } else if (matched.has(key)) {
        collateral++;
      }
    }
    // Locked layers (any idx > activeIdx): every match is collateral
    for (let li = activeIdx + 1; li < monster.layers.length; li++) {
      const layer = monster.layers[li]!;
      for (let i = 0; i < layer.lines.length; i++) {
        if (matched.has(`${li}:${i}`)) collateral++;
      }
    }
    // Heart in layer phase = locked → collateral if matched
    if (matched.has("heart")) collateral++;
  } else if (isHeartPhase) {
    vitalsTotal = 1;
    if (matched.has("heart")) vitalsHit = 1;
    // Anything else still in the body that matches is collateral.
    // Stripped layers don't count — but in heart phase, only the heart remains "alive".
    // For safety, count any non-heart match as collateral.
    for (const key of matched) {
      if (key !== "heart") collateral++;
    }
  }

  const perfect = vitalsTotal > 0 && vitalsHit === vitalsTotal && collateral === 0;
  return { vitalsHit, vitalsTotal, collateral, perfect, matchedLineKeys: matched };
}

function testRegex(re: RegExp, text: string): boolean {
  re.lastIndex = 0;
  return re.test(text);
}

function withTotals(base: EvalResult, monster: Monster, phase: CombatPhase): EvalResult {
  if (phase.kind === "layerActive") {
    const layer = monster.layers[phase.layerIdx]!;
    const total = layer.lines.filter((l) => l.vital).length;
    return { ...base, vitalsTotal: total };
  }
  if (phase.kind === "heart") {
    return { ...base, vitalsTotal: 1 };
  }
  return base;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/game/matcher.test.ts`
Expected: all tests PASS.

If the catastrophic-backtracking test takes >2s, increase the input string repetition (e.g. `"a".repeat(40)`) until it triggers — V8's regex engine performance is platform-specific.

- [ ] **Step 5: Commit**

```bash
git add src/game/matcher.ts tests/game/matcher.test.ts
git commit -m "feat(game): regex matcher with collateral, heart phase, slow-pattern guard"
```

---

## Task 3: Damage formula and symbolic feedback

**Files:**
- Create: `tests/game/damage.test.ts`
- Create: `src/game/damage.ts`

Spec ref: §5.3, §5.4.

- [ ] **Step 1: Write the failing tests**

Create `tests/game/damage.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { computeDamage, symbolicFor } from "@/game/damage";

describe("computeDamage", () => {
  test("perfect = 100", () => {
    expect(computeDamage({ vitalsHit: 2, vitalsTotal: 2, collateral: 0 })).toBe(100);
  });
  test("half vitals, no collateral = 50", () => {
    expect(computeDamage({ vitalsHit: 1, vitalsTotal: 2, collateral: 0 })).toBe(50);
  });
  test("all vitals, 1 collateral = 75", () => {
    expect(computeDamage({ vitalsHit: 2, vitalsTotal: 2, collateral: 1 })).toBe(75);
  });
  test("all vitals, 4+ collateral floors at 20", () => {
    expect(computeDamage({ vitalsHit: 2, vitalsTotal: 2, collateral: 4 })).toBe(20);
    expect(computeDamage({ vitalsHit: 2, vitalsTotal: 2, collateral: 99 })).toBe(20);
  });
  test("zero vitals = 0", () => {
    expect(computeDamage({ vitalsHit: 0, vitalsTotal: 2, collateral: 0 })).toBe(0);
  });
  test("vitalsTotal 0 returns 0", () => {
    expect(computeDamage({ vitalsHit: 0, vitalsTotal: 0, collateral: 0 })).toBe(0);
  });
});

describe("symbolicFor", () => {
  test("0 = no match", () => {
    expect(symbolicFor(0)).toEqual({ glyph: "⚪", label: "no match" });
  });
  test("25 = partial", () => {
    expect(symbolicFor(25)).toEqual({ glyph: "🔸", label: "partial" });
  });
  test("75 = close", () => {
    expect(symbolicFor(75)).toEqual({ glyph: "🔶", label: "close" });
  });
  test("100 = perfect", () => {
    expect(symbolicFor(100)).toEqual({ glyph: "🔥", label: "perfect" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/game/damage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/game/damage.ts`:

```ts
export type DamageInput = {
  vitalsHit: number;
  vitalsTotal: number;
  collateral: number;
};

export function computeDamage({ vitalsHit, vitalsTotal, collateral }: DamageInput): number {
  if (vitalsTotal === 0) return 0;
  const base = (vitalsHit / vitalsTotal) * 100;
  const penalty = Math.max(0.2, 1 - 0.25 * collateral);
  return Math.round(base * penalty);
}

export type Symbolic = { glyph: string; label: string };

export function symbolicFor(damage: number): Symbolic {
  if (damage <= 0) return { glyph: "⚪", label: "no match" };
  if (damage < 50) return { glyph: "🔸", label: "partial" };
  if (damage < 100) return { glyph: "🔶", label: "close" };
  return { glyph: "🔥", label: "perfect" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/game/damage.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/damage.ts tests/game/damage.test.ts
git commit -m "feat(game): damage formula and symbolic feedback mapping"
```

---

## Task 4: Combat state machine

**Files:**
- Create: `tests/game/combat.test.ts`
- Create: `src/game/combat.ts`

Spec ref: §4.2, §5.6.

- [ ] **Step 1: Write the failing tests**

Create `tests/game/combat.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { initialState, advance, type CombatState } from "@/game/combat";
import type { Monster } from "@/game/types";

const monster: Monster = {
  id: "m",
  name: "Test",
  portrait: "x",
  flavor: "",
  layers: [
    { topic: "l1", lines: [{ text: "a", vital: true }] },
    { topic: "l2", lines: [{ text: "b", vital: true }] },
  ],
  heart: { text: "H" },
};

describe("combat state machine", () => {
  test("initial state is intro", () => {
    const s = initialState(monster);
    expect(s.phase.kind).toBe("intro");
    expect(s.layersStripped).toEqual([]);
  });

  test("dismissIntro → layerActive(0)", () => {
    const s = advance(initialState(monster), { kind: "dismissIntro" });
    expect(s.phase).toEqual({ kind: "layerActive", layerIdx: 0 });
  });

  test("perfectMatch on layer 0 → strip then layer 1", () => {
    let s: CombatState = advance(initialState(monster), { kind: "dismissIntro" });
    s = advance(s, { kind: "perfectMatch", pattern: "a" });
    expect(s.phase.kind).toBe("strip");
    s = advance(s, { kind: "stripDone" });
    expect(s.phase).toEqual({ kind: "layerActive", layerIdx: 1 });
    expect(s.layersStripped).toEqual([0]);
    expect(s.bestRegexes["0"]?.pattern).toBe("a");
  });

  test("perfectMatch on last layer → strip then heart", () => {
    let s: CombatState = advance(initialState(monster), { kind: "dismissIntro" });
    s = advance(s, { kind: "perfectMatch", pattern: "a" });
    s = advance(s, { kind: "stripDone" });
    s = advance(s, { kind: "perfectMatch", pattern: "b" });
    s = advance(s, { kind: "stripDone" });
    expect(s.phase).toEqual({ kind: "heart" });
    expect(s.layersStripped).toEqual([0, 1]);
  });

  test("perfectMatch in heart → kill", () => {
    let s = initialState(monster);
    s = advance(s, { kind: "dismissIntro" });
    s = advance(s, { kind: "perfectMatch", pattern: "a" });
    s = advance(s, { kind: "stripDone" });
    s = advance(s, { kind: "perfectMatch", pattern: "b" });
    s = advance(s, { kind: "stripDone" });
    s = advance(s, { kind: "perfectMatch", pattern: "H" });
    expect(s.phase).toEqual({ kind: "kill" });
    expect(s.bestRegexes["heart"]?.pattern).toBe("H");
  });

  test("best regex is the shortest perfect pattern per layer", () => {
    let s = initialState(monster);
    s = advance(s, { kind: "dismissIntro" });
    s = advance(s, { kind: "perfectMatch", pattern: "[a]" }); // length 3
    s = advance(s, { kind: "perfectMatch", pattern: "a" });   // length 1 — should win
    expect(s.bestRegexes["0"]?.pattern).toBe("a");
    expect(s.bestRegexes["0"]?.length).toBe(1);
  });

  test("perfectMatch ignored outside layerActive/heart", () => {
    const s = initialState(monster); // intro
    const s2 = advance(s, { kind: "perfectMatch", pattern: "a" });
    expect(s2).toBe(s);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/game/combat.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/game/combat.ts`:

```ts
import type { BestRegex, CombatPhase, Monster } from "./types";

export type CombatState = {
  monster: Monster;
  phase: CombatPhase;
  layersStripped: number[];     // indices of stripped layers, in order
  bestRegexes: Record<string, BestRegex>; // keys "0"..."N", "heart"
};

export type CombatEvent =
  | { kind: "dismissIntro" }
  | { kind: "perfectMatch"; pattern: string }
  | { kind: "stripDone" }
  | { kind: "dismissKill" };

export function initialState(monster: Monster): CombatState {
  return {
    monster,
    phase: { kind: "intro" },
    layersStripped: [],
    bestRegexes: {},
  };
}

export function advance(state: CombatState, ev: CombatEvent): CombatState {
  switch (ev.kind) {
    case "dismissIntro": {
      if (state.phase.kind !== "intro") return state;
      return { ...state, phase: { kind: "layerActive", layerIdx: 0 } };
    }
    case "perfectMatch": {
      if (state.phase.kind === "layerActive") {
        const idx = state.phase.layerIdx;
        const key = String(idx);
        return {
          ...state,
          phase: { kind: "strip", layerIdx: idx },
          bestRegexes: recordBest(state.bestRegexes, key, ev.pattern),
        };
      }
      if (state.phase.kind === "heart") {
        return {
          ...state,
          phase: { kind: "kill" },
          bestRegexes: recordBest(state.bestRegexes, "heart", ev.pattern),
        };
      }
      return state;
    }
    case "stripDone": {
      if (state.phase.kind !== "strip") return state;
      const stripped = [...state.layersStripped, state.phase.layerIdx];
      const next = state.phase.layerIdx + 1;
      const phase: CombatPhase =
        next < state.monster.layers.length
          ? { kind: "layerActive", layerIdx: next }
          : { kind: "heart" };
      return { ...state, phase, layersStripped: stripped };
    }
    case "dismissKill": {
      return state; // terminal — surrounding screen handles transition
    }
  }
}

function recordBest(
  map: Record<string, BestRegex>,
  key: string,
  pattern: string,
): Record<string, BestRegex> {
  const length = pattern.length;
  const existing = map[key];
  if (existing && existing.length <= length) return map;
  return { ...map, [key]: { pattern, length } };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/game/combat.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/combat.ts tests/game/combat.test.ts
git commit -m "feat(game): combat state machine (intro → layers → heart → kill)"
```

---

## Task 5: Save / load (atomic, corruption-safe)

**Files:**
- Create: `tests/game/progress.test.ts`
- Create: `src/game/progress.ts`

Spec ref: §8.

- [ ] **Step 1: Write the failing tests**

Create `tests/game/progress.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadSave, recordKill, saveFilePath } from "@/game/progress";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rxs-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadSave", () => {
  test("missing file returns fresh save", () => {
    const save = loadSave({ baseDir: dir });
    expect(save.version).toBe(1);
    expect(save.chapters).toEqual({});
    expect(existsSync(saveFilePath(dir))).toBe(false);
  });

  test("corrupt file is renamed and a fresh save returned", () => {
    writeFileSync(saveFilePath(dir), "not json");
    const save = loadSave({ baseDir: dir });
    expect(save.chapters).toEqual({});
    const files = readdirSync(dir);
    expect(files.some((f) => f.startsWith("save.json.corrupt-"))).toBe(true);
  });

  test("valid file is parsed", () => {
    const seed = {
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      chapters: {
        "char-classes": {
          monsters: {
            grim: {
              slainAt: "2026-01-02T00:00:00Z",
              bestRegexes: { "0": { pattern: "a", length: 1 } },
            },
          },
        },
      },
    };
    writeFileSync(saveFilePath(dir), JSON.stringify(seed));
    const save = loadSave({ baseDir: dir });
    expect(save.chapters["char-classes"]?.monsters["grim"]?.bestRegexes["0"]?.pattern).toBe("a");
  });
});

describe("recordKill", () => {
  test("adds monster record, persists, and reports persisted=true", () => {
    const save = loadSave({ baseDir: dir });
    const result = recordKill(save, {
      chapterId: "ch1",
      monsterId: "m1",
      bestRegexes: { "0": { pattern: "a", length: 1 } },
      now: "2026-05-04T00:00:00Z",
      baseDir: dir,
    });
    expect(result.persisted).toBe(true);
    expect(result.save.chapters["ch1"]?.monsters["m1"]?.slainAt).toBe("2026-05-04T00:00:00Z");
    const reloaded = loadSave({ baseDir: dir });
    expect(reloaded.chapters["ch1"]?.monsters["m1"]?.bestRegexes["0"]?.pattern).toBe("a");
  });

  test("reports persisted=false when the base directory cannot be written", () => {
    // /dev/null is not a directory, so mkdirSync + writeFileSync underneath will fail
    const save = loadSave({ baseDir: dir });
    const result = recordKill(save, {
      chapterId: "ch1",
      monsterId: "m1",
      bestRegexes: {},
      now: "2026-05-04T00:00:00Z",
      baseDir: "/dev/null/nope",
    });
    expect(result.persisted).toBe(false);
    // In-memory result should still be updated for the caller
    expect(result.save.chapters["ch1"]?.monsters["m1"]?.slainAt).toBe("2026-05-04T00:00:00Z");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/game/progress.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/game/progress.ts`:

```ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { BestRegex, SaveFile } from "./types";

export function defaultBaseDir(): string {
  if (process.platform !== "darwin" && process.env["XDG_DATA_HOME"]) {
    return join(process.env["XDG_DATA_HOME"]!, "regxslayer");
  }
  return join(homedir(), ".regxslayer");
}

export function saveFilePath(baseDir: string): string {
  return join(baseDir, "save.json");
}

function freshSave(): SaveFile {
  const now = new Date().toISOString();
  return { version: 1, createdAt: now, updatedAt: now, chapters: {} };
}

export type LoadOptions = { baseDir?: string };

export function loadSave(opts: LoadOptions = {}): SaveFile {
  const baseDir = opts.baseDir ?? defaultBaseDir();
  const path = saveFilePath(baseDir);
  if (!existsSync(path)) return freshSave();
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return freshSave();
  }
  try {
    const parsed = JSON.parse(raw) as SaveFile;
    if (parsed.version !== 1 || typeof parsed.chapters !== "object") {
      throw new Error("invalid shape");
    }
    return parsed;
  } catch {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    try { renameSync(path, `${path}.corrupt-${stamp}`); } catch { /* ignore */ }
    return freshSave();
  }
}

export type RecordKillInput = {
  chapterId: string;
  monsterId: string;
  bestRegexes: Record<string, BestRegex>;
  now?: string;
  baseDir?: string;
};

export type RecordKillResult = {
  save: SaveFile;
  /** True if the on-disk file was written successfully. UI should warn when false. */
  persisted: boolean;
};

export function recordKill(save: SaveFile, input: RecordKillInput): RecordKillResult {
  const now = input.now ?? new Date().toISOString();
  const baseDir = input.baseDir ?? defaultBaseDir();
  const chapter = save.chapters[input.chapterId] ?? { monsters: {} };
  const existing = chapter.monsters[input.monsterId];
  const merged = mergeBest(existing?.bestRegexes ?? {}, input.bestRegexes);
  const nextSave: SaveFile = {
    ...save,
    updatedAt: now,
    chapters: {
      ...save.chapters,
      [input.chapterId]: {
        monsters: {
          ...chapter.monsters,
          [input.monsterId]: {
            slainAt: existing?.slainAt ?? now,
            bestRegexes: merged,
          },
        },
      },
    },
  };
  const persisted = persist(nextSave, baseDir);
  return { save: nextSave, persisted };
}

function mergeBest(
  prev: Record<string, BestRegex>,
  add: Record<string, BestRegex>,
): Record<string, BestRegex> {
  const out: Record<string, BestRegex> = { ...prev };
  for (const [k, v] of Object.entries(add)) {
    const existing = out[k];
    if (!existing || v.length < existing.length) out[k] = v;
  }
  return out;
}

function persist(save: SaveFile, baseDir: string): boolean {
  try {
    mkdirSync(baseDir, { recursive: true });
    const path = saveFilePath(baseDir);
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, JSON.stringify(save, null, 2), "utf8");
    renameSync(tmp, path);
    return true;
  } catch {
    // The caller (App router, Task 20) tracks persisted=false and shows a
    // non-blocking footer warning per spec §9 (save unwritable).
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/game/progress.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/progress.ts tests/game/progress.test.ts
git commit -m "feat(game): atomic save/load with corruption recovery"
```

---

# Phase 2 — Content scaffolding & validator

We need just enough content for the UI work, then we'll fill out the rest in Phase 9 once the game is playable.

## Task 6: Content validator

**Files:**
- Create: `tests/scripts/validate-content.test.ts`
- Create: `scripts/validate-content.ts`

Spec ref: §7.5.

- [ ] **Step 1: Write the failing tests**

Create `tests/scripts/validate-content.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { validateChapter, type ValidationIssue } from "@/../scripts/validate-content";
import type { Chapter } from "@/game/types";

const ok: Chapter = {
  id: "test",
  title: "Test",
  intro: "",
  cheatsheet: [],
  monsters: [
    {
      id: "m",
      name: "M",
      portrait: "p",
      flavor: "",
      layers: [
        {
          topic: "t",
          lines: [
            { text: "alpha", vital: true },
            { text: "beta", vital: true },
            { text: "noise", vital: false },
            { text: "https://example.com", vital: false },
          ],
        },
      ],
      heart: { text: "HEART_X1" },
    },
  ],
};

describe("validateChapter", () => {
  test("good chapter has no issues", () => {
    expect(validateChapter(ok)).toEqual([]);
  });

  test("layer with no vitals fails", () => {
    const bad: Chapter = structuredClone(ok);
    bad.monsters[0]!.layers[0]!.lines.forEach((l) => (l.vital = false));
    const issues = validateChapter(bad);
    expect(issues.some((i: ValidationIssue) => i.code === "no-vitals")).toBe(true);
  });

  test("layer over 8 lines fails", () => {
    const bad: Chapter = structuredClone(ok);
    bad.monsters[0]!.layers[0]!.lines = Array.from({ length: 9 }, (_, i) => ({
      text: `x${i}`,
      vital: i === 0,
    }));
    expect(validateChapter(bad).some((i) => i.code === "layer-too-large")).toBe(true);
  });

  test("trivial heart fails", () => {
    const bad: Chapter = structuredClone(ok);
    bad.monsters[0]!.heart.text = "aa";
    expect(validateChapter(bad).some((i) => i.code === "trivial-heart")).toBe(true);
  });

  test("layer killable by .* fails (trivial-killer)", () => {
    const bad: Chapter = structuredClone(ok);
    bad.monsters[0]!.layers[0]!.lines = [
      { text: "alpha", vital: true },
      { text: "beta", vital: true },
    ]; // every line is vital → .+ would clean-strip
    expect(validateChapter(bad).some((i) => i.code === "trivial-killer")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/scripts/validate-content.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement validator**

Create `scripts/validate-content.ts`:

```ts
#!/usr/bin/env bun
import type { Chapter } from "../src/game/types";

export type ValidationIssue = {
  monsterId?: string;
  layerIdx?: number;
  code:
    | "no-layers"
    | "no-vitals"
    | "layer-too-large"
    | "trivial-heart"
    | "trivial-killer";
  message: string;
};

const TRIVIAL_PATTERNS = [".*", ".+", "\\w+", "\\S+"];

export function validateChapter(chapter: Chapter): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const m of chapter.monsters) {
    if (m.layers.length === 0) {
      issues.push({ monsterId: m.id, code: "no-layers", message: "monster has no layers" });
      continue;
    }
    if (m.heart.text.length < 3 || /^(.)\1+$/.test(m.heart.text)) {
      issues.push({ monsterId: m.id, code: "trivial-heart", message: `heart "${m.heart.text}" too trivial` });
    }
    m.layers.forEach((layer, idx) => {
      if (layer.lines.length > 8) {
        issues.push({ monsterId: m.id, layerIdx: idx, code: "layer-too-large", message: `${layer.lines.length} lines > 8` });
      }
      const vitalCount = layer.lines.filter((l) => l.vital).length;
      if (vitalCount === 0) {
        issues.push({ monsterId: m.id, layerIdx: idx, code: "no-vitals", message: "no vital lines in layer" });
      }
      // Trivial-killer: any of TRIVIAL_PATTERNS must over-match (collateral > 0
      // or vitals < total). If a trivial pattern matches all vitals and no
      // filler, the layer is solvable without the topic's actual technique.
      const totalVitals = vitalCount;
      const trivialBeats = TRIVIAL_PATTERNS.some((p) => {
        const re = new RegExp(p, "u");
        let hits = 0;
        let collateral = 0;
        for (const line of layer.lines) {
          if (re.test(line.text)) {
            line.vital ? hits++ : collateral++;
          }
        }
        return hits === totalVitals && collateral === 0 && totalVitals > 0;
      });
      if (trivialBeats) {
        issues.push({
          monsterId: m.id,
          layerIdx: idx,
          code: "trivial-killer",
          message: `a trivial regex (one of ${TRIVIAL_PATTERNS.join(", ")}) clean-strips this layer`,
        });
      }
    });
  }
  return issues;
}

// Run as script: validate every chapter in src/content/chapters.ts
async function main(): Promise<void> {
  const mod = await import("../src/content/chapters");
  const chapters: Chapter[] = mod.chapters;
  const all = chapters.flatMap((c) => validateChapter(c).map((i) => ({ chapterId: c.id, ...i })));
  if (all.length === 0) {
    console.log(`✓ ${chapters.length} chapter(s) validated, no issues.`);
    return;
  }
  for (const i of all) {
    console.error(`✗ [${i.chapterId}/${i.monsterId ?? "?"}/L${i.layerIdx ?? "?"}] ${i.code}: ${i.message}`);
  }
  process.exit(1);
}

if (import.meta.main) {
  main();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/scripts/validate-content.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-content.ts tests/scripts/validate-content.test.ts
git commit -m "feat(content): build-time content validator with trivial-killer guard"
```

---

## Task 7: Placeholder content (1 monster) for UI development

This single monster lets us build the UI before authoring the full 12. Phase 9 replaces this file with the real chapter-1 content and adds chapters 2 and 3.

**Files:**
- Create: `src/content/portraits.ts`
- Create: `src/content/chapter-1-literals.ts`
- Create: `src/content/chapters.ts`
- Create: `tests/content/chapters.test.ts`

- [ ] **Step 1: Create portraits**

Create `src/content/portraits.ts`:

```ts
export const portraits: Record<string, string[]> = {
  scribblet: [
    "  ,---,  ",
    " ( o.o ) ",
    "  \\___/  ",
  ],
};
```

- [ ] **Step 2: Create chapter-1**

Create `src/content/chapter-1-literals.ts`:

```ts
import type { Chapter } from "@/game/types";

export const chapter: Chapter = {
  id: "literals-anchors",
  title: "Literals & Anchors",
  intro: "First steps: match exact text, use ^ and $ to pin where you mean.",
  cheatsheet: [
    "abc       matches the literal text 'abc'",
    "^abc      matches 'abc' only at line start",
    "abc$      matches 'abc' only at line end",
    "^abc$     matches lines that are exactly 'abc'",
    "a|b       matches 'a' or 'b'",
    "(...)     groups; useful with |",
  ],
  monsters: [
    {
      id: "scribblet",
      name: "Scribblet the Inkblot",
      portrait: "scribblet",
      flavor: "A soft, smudgy thing. Good for warming up.",
      layers: [
        {
          topic: "literal text",
          lines: [
            { text: "hello",        vital: true  },
            { text: "world",        vital: true  },
            { text: "hello world",  vital: false },
            { text: "say hello",    vital: false },
          ],
        },
        {
          topic: "anchors",
          lines: [
            { text: "alpha",     vital: true  },
            { text: "beta",      vital: true  },
            { text: "alphabet",  vital: false },
            { text: "betamax",   vital: false },
          ],
        },
      ],
      heart: { text: "INK_HEART_42" },
    },
  ],
};
```

- [ ] **Step 3: Create chapters index**

Create `src/content/chapters.ts`:

```ts
import type { Chapter } from "@/game/types";
import { chapter as chapter1 } from "./chapter-1-literals";

export const chapters: Chapter[] = [chapter1];
```

- [ ] **Step 4: Write a data-driven test that runs the validator**

Create `tests/content/chapters.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { chapters } from "@/content/chapters";
import { validateChapter } from "@/../scripts/validate-content";

describe("chapter content", () => {
  for (const ch of chapters) {
    test(`chapter "${ch.id}" passes validation`, () => {
      expect(validateChapter(ch)).toEqual([]);
    });
  }
});
```

- [ ] **Step 5: Run tests + validator**

Run: `bun test`
Expected: all tests pass (including the chapter validation).

Run: `bun run validate-content`
Expected: `✓ 1 chapter(s) validated, no issues.`

- [ ] **Step 6: Commit**

```bash
git add src/content/portraits.ts src/content/chapter-1-literals.ts src/content/chapters.ts tests/content/chapters.test.ts
git commit -m "feat(content): placeholder chapter-1 with one monster (scribblet) for UI dev"
```

---

# Phase 3 — UI components

Each component is small, focused, and presentational. Render tests use `@gridland/testing`. If `@gridland/testing` doesn't expose the names assumed below (`renderTui`, `Screen`, `KeySender`), inspect `node_modules/@gridland/testing/dist/index.d.ts` and adapt the import names; the test bodies still apply.

## Task 8: HpBar

**Files:**
- Create: `src/components/HpBar.tsx`
- Create: `tests/components/HpBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/HpBar.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { HpBar } from "@/components/HpBar";

afterEach(cleanup);

describe("HpBar", () => {
  test("renders 100% as a fully filled bar", () => {
    const ui = renderTui(<HpBar percent={100} max={100} />);
    expect(ui.screen.contains("100/100")).toBe(true);
    expect(ui.screen.contains("█".repeat(10))).toBe(true);
  });

  test("renders 0% as empty bar", () => {
    const ui = renderTui(<HpBar percent={0} max={100} />);
    expect(ui.screen.contains("0/100")).toBe(true);
    expect(ui.screen.contains("░".repeat(10))).toBe(true);
  });

  test("renders 50% as half bar", () => {
    const ui = renderTui(<HpBar percent={50} max={100} />);
    expect(ui.screen.contains("50/100")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

Run: `bun test tests/components/HpBar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/HpBar.tsx`:

```tsx
import React from "react";

export type HpBarProps = {
  percent: number;   // 0..100
  max: number;       // for the readout, e.g. 100/100
};

export function HpBar({ percent, max }: HpBarProps): React.ReactElement {
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * 10);
  const empty = 10 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const value = Math.round((percent / 100) * max);
  return (
    <text>
      HP {bar} {value}/{max}
    </text>
  );
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test tests/components/HpBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/HpBar.tsx tests/components/HpBar.test.tsx
git commit -m "feat(ui): HpBar component"
```

---

## Task 9: MonsterPortrait

**Files:**
- Create: `src/components/MonsterPortrait.tsx`
- Create: `tests/components/MonsterPortrait.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/MonsterPortrait.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { MonsterPortrait } from "@/components/MonsterPortrait";

afterEach(cleanup);

describe("MonsterPortrait", () => {
  test("renders the named ASCII portrait", () => {
    const ui = renderTui(<MonsterPortrait name="scribblet" />);
    expect(ui.screen.contains("o.o")).toBe(true);
  });

  test("falls back to '?' block when name unknown", () => {
    const ui = renderTui(<MonsterPortrait name="notthere" />);
    expect(ui.screen.contains("???")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/components/MonsterPortrait.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/MonsterPortrait.tsx`:

```tsx
import React from "react";
import { portraits } from "@/content/portraits";

const FALLBACK = ["???", "???", "???"];

export type MonsterPortraitProps = {
  name: string;
};

export function MonsterPortrait({ name }: MonsterPortraitProps): React.ReactElement {
  const lines = portraits[name] ?? FALLBACK;
  return (
    <box flexDirection="column">
      {lines.map((l, i) => (
        <text key={i}>{l}</text>
      ))}
    </box>
  );
}
```

- [ ] **Step 4: Verify**

Run: `bun test tests/components/MonsterPortrait.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MonsterPortrait.tsx tests/components/MonsterPortrait.test.tsx
git commit -m "feat(ui): MonsterPortrait component"
```

---

## Task 10: LayerRoadmap

**Files:**
- Create: `src/components/LayerRoadmap.tsx`
- Create: `tests/components/LayerRoadmap.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/LayerRoadmap.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { LayerRoadmap } from "@/components/LayerRoadmap";

afterEach(cleanup);

describe("LayerRoadmap", () => {
  test("marks active, stripped, locked, heart correctly", () => {
    const ui = renderTui(
      <LayerRoadmap
        topics={["literals", "char class", "quantifiers"]}
        activeIdx={1}
        strippedIdxs={[0]}
        inHeart={false}
      />
    );
    const txt = ui.screen.text();
    expect(txt).toContain("✓");           // for stripped
    expect(txt).toContain("▲");           // for active
    expect(txt).toContain("○");           // for locked
    expect(txt).toContain("heart");
  });

  test("inHeart highlights heart row", () => {
    const ui = renderTui(
      <LayerRoadmap topics={["literals"]} activeIdx={0} strippedIdxs={[0]} inHeart={true} />
    );
    expect(ui.screen.contains("▲ heart")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/components/LayerRoadmap.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/LayerRoadmap.tsx`:

```tsx
import React from "react";

export type LayerRoadmapProps = {
  topics: string[];
  activeIdx: number;
  strippedIdxs: number[];
  inHeart: boolean;
};

export function LayerRoadmap({ topics, activeIdx, strippedIdxs, inHeart }: LayerRoadmapProps): React.ReactElement {
  const stripped = new Set(strippedIdxs);
  return (
    <box flexDirection="column">
      {topics.map((t, i) => {
        const dot = stripped.has(i) || (!inHeart && i < activeIdx) ? "●" : i === activeIdx && !inHeart ? "●" : "○";
        const tail = stripped.has(i) ? " ✓" : (!inHeart && i === activeIdx) ? " ▲" : "";
        return (
          <text key={i}>
            {dot} {t}{tail}
          </text>
        );
      })}
      <text>{inHeart ? "▲ heart" : "○ heart"}</text>
    </box>
  );
}
```

- [ ] **Step 4: Verify**

Run: `bun test tests/components/LayerRoadmap.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LayerRoadmap.tsx tests/components/LayerRoadmap.test.tsx
git commit -m "feat(ui): LayerRoadmap component"
```

---

## Task 11: BodyView (gutter markers + live highlight)

**Files:**
- Create: `src/components/BodyView.tsx`
- Create: `tests/components/BodyView.test.tsx`

Spec ref: §5.1 (render states), §6.3.

- [ ] **Step 1: Write the failing test**

Create `tests/components/BodyView.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { BodyView } from "@/components/BodyView";
import type { Monster } from "@/game/types";

afterEach(cleanup);

const monster: Monster = {
  id: "m", name: "M", portrait: "p", flavor: "",
  layers: [
    { topic: "L1", lines: [{ text: "alpha", vital: true }, { text: "noise", vital: false }] },
    { topic: "L2", lines: [{ text: "gamma", vital: true }] },
  ],
  heart: { text: "HEART" },
};

describe("BodyView", () => {
  test("active layer rows show ♦ for vital", () => {
    const ui = renderTui(
      <BodyView
        monster={monster}
        activeLayerIdx={0}
        strippedIdxs={[]}
        inHeart={false}
        matchedKeys={new Set()}
      />
    );
    expect(ui.screen.contains("♦ alpha")).toBe(true);
    expect(ui.screen.contains("  noise")).toBe(true);  // filler: blank gutter
  });

  test("locked layer rows show ⛓ in gutter", () => {
    const ui = renderTui(
      <BodyView
        monster={monster}
        activeLayerIdx={0}
        strippedIdxs={[]}
        inHeart={false}
        matchedKeys={new Set()}
      />
    );
    expect(ui.screen.contains("⛓ gamma")).toBe(true);
  });

  test("stripped layer rows show [STRIPPED] prefix", () => {
    const ui = renderTui(
      <BodyView
        monster={monster}
        activeLayerIdx={1}
        strippedIdxs={[0]}
        inHeart={false}
        matchedKeys={new Set()}
      />
    );
    expect(ui.screen.contains("[STRIPPED]")).toBe(true);
  });

  test("matched lines wrap text in › ‹ brackets", () => {
    const matched = new Set<string>(["0:0"]);
    const ui = renderTui(
      <BodyView
        monster={monster}
        activeLayerIdx={0}
        strippedIdxs={[]}
        inHeart={false}
        matchedKeys={matched}
      />
    );
    expect(ui.screen.contains("›alpha‹")).toBe(true);
  });

  test("heart phase shows the heart line as ♦", () => {
    const ui = renderTui(
      <BodyView
        monster={monster}
        activeLayerIdx={0}
        strippedIdxs={[0, 1]}
        inHeart={true}
        matchedKeys={new Set()}
      />
    );
    expect(ui.screen.contains("♦ HEART")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/components/BodyView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/BodyView.tsx`:

```tsx
import React from "react";
import type { Monster } from "@/game/types";

export type BodyViewProps = {
  monster: Monster;
  activeLayerIdx: number;
  strippedIdxs: number[];
  inHeart: boolean;
  matchedKeys: ReadonlySet<string>;
};

export function BodyView(props: BodyViewProps): React.ReactElement {
  const { monster, activeLayerIdx, strippedIdxs, inHeart, matchedKeys } = props;
  const stripped = new Set(strippedIdxs);

  return (
    <box flexDirection="column">
      {monster.layers.map((layer, li) => (
        <box flexDirection="column" key={li}>
          {layer.lines.map((line, i) => {
            const key = `${li}:${i}`;
            const isStripped = stripped.has(li);
            const isActive = !inHeart && li === activeLayerIdx && !isStripped;
            const isLocked = !inHeart && li > activeLayerIdx;
            const matched = matchedKeys.has(key);

            const gutter =
              isStripped ? " " :
              isActive   ? (line.vital ? "♦" : " ") :
              isLocked   ? "⛓" :
              " ";

            const display = matched ? `›${line.text}‹` : line.text;
            const prefix  = isStripped ? "[STRIPPED] " : "";
            return (
              <text key={i}>{gutter} {prefix}{display}</text>
            );
          })}
        </box>
      ))}
      {/* heart row */}
      {(() => {
        const matched = matchedKeys.has("heart");
        const display = matched ? `›${monster.heart.text}‹` : monster.heart.text;
        const gutter = inHeart ? "♦" : " ";
        return <text>{gutter} {display}</text>;
      })()}
    </box>
  );
}
```

- [ ] **Step 4: Verify**

Run: `bun test tests/components/BodyView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BodyView.tsx tests/components/BodyView.test.tsx
git commit -m "feat(ui): BodyView with gutter markers, locked/stripped states, match highlight"
```

---

## Task 12: RegexInput

**Files:**
- Create: `src/components/RegexInput.tsx`
- Create: `tests/components/RegexInput.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/RegexInput.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { RegexInput } from "@/components/RegexInput";

afterEach(cleanup);

describe("RegexInput", () => {
  test("renders the value with a leading marker", () => {
    const ui = renderTui(<RegexInput value="^abc$" onChange={() => {}} />);
    expect(ui.screen.contains("▶ ^abc$")).toBe(true);
  });

  test("shows inline error when invalid prop is set", () => {
    const ui = renderTui(<RegexInput value="(" onChange={() => {}} invalid="Unterminated group" />);
    expect(ui.screen.contains("⚠ Unterminated group")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/components/RegexInput.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/RegexInput.tsx`:

```tsx
import React from "react";

export type RegexInputProps = {
  value: string;
  onChange: (next: string) => void;
  invalid?: string | undefined;
};

export function RegexInput({ value, onChange, invalid }: RegexInputProps): React.ReactElement {
  return (
    <box flexDirection="row" gap={1}>
      <text>▶ {value}</text>
      <input value={value} focused onInput={onChange} maxLength={256} />
      {invalid ? <text>⚠ {invalid}</text> : null}
    </box>
  );
}
```

Note: The visible "▶ value" line is what the user reads; the actual `<input>` provides the keyboard handling and cursor. We rely on the renderer to show the cursor inside `<input>`. If display ends up doubling up, drop the leading `<text>` and rely on `<input>` alone — the test asserts the value text appears, which both arrangements satisfy.

- [ ] **Step 4: Verify**

Run: `bun test tests/components/RegexInput.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RegexInput.tsx tests/components/RegexInput.test.tsx
git commit -m "feat(ui): RegexInput with inline error display"
```

---

## Task 13: FeedbackLine

**Files:**
- Create: `src/components/FeedbackLine.tsx`
- Create: `tests/components/FeedbackLine.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/FeedbackLine.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { FeedbackLine } from "@/components/FeedbackLine";

afterEach(cleanup);

describe("FeedbackLine", () => {
  test("shows numeric breakdown and symbolic line", () => {
    const ui = renderTui(
      <FeedbackLine vitalsHit={1} vitalsTotal={2} collateral={0} damage={50} />
    );
    expect(ui.screen.contains("1/2 vitals")).toBe(true);
    expect(ui.screen.contains("collateral 0")).toBe(true);
    expect(ui.screen.contains("dmg 50")).toBe(true);
    expect(ui.screen.contains("close")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/components/FeedbackLine.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/FeedbackLine.tsx`:

```tsx
import React from "react";
import { symbolicFor } from "@/game/damage";

export type FeedbackLineProps = {
  vitalsHit: number;
  vitalsTotal: number;
  collateral: number;
  damage: number;
};

export function FeedbackLine({ vitalsHit, vitalsTotal, collateral, damage }: FeedbackLineProps): React.ReactElement {
  const sym = symbolicFor(damage);
  return (
    <box flexDirection="column">
      <text>{vitalsHit}/{vitalsTotal} vitals · collateral {collateral} · dmg {damage}</text>
      <text>{sym.glyph} {sym.label}</text>
    </box>
  );
}
```

- [ ] **Step 4: Verify**

Run: `bun test tests/components/FeedbackLine.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/FeedbackLine.tsx tests/components/FeedbackLine.test.tsx
git commit -m "feat(ui): FeedbackLine numeric + symbolic"
```

---

## Task 14: ControlsHint and HintOverlay

**Files:**
- Create: `src/components/ControlsHint.tsx`
- Create: `src/components/HintOverlay.tsx`
- Create: `tests/components/HintOverlay.test.tsx`

- [ ] **Step 1: Create ControlsHint**

Create `src/components/ControlsHint.tsx`:

```tsx
import React from "react";

export function ControlsHint(): React.ReactElement {
  return <text>[?] hint   [esc] flee</text>;
}
```

- [ ] **Step 2: Write HintOverlay test**

Create `tests/components/HintOverlay.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { HintOverlay } from "@/components/HintOverlay";

afterEach(cleanup);

describe("HintOverlay", () => {
  test("renders chapter title and cheatsheet lines", () => {
    const ui = renderTui(
      <HintOverlay
        title="Character Classes"
        lines={["\\d  digit", "\\w  word"]}
      />
    );
    expect(ui.screen.contains("Character Classes")).toBe(true);
    expect(ui.screen.contains("\\d  digit")).toBe(true);
  });
});
```

- [ ] **Step 3: Run test**

Run: `bun test tests/components/HintOverlay.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement HintOverlay**

Create `src/components/HintOverlay.tsx`:

```tsx
import React from "react";

export type HintOverlayProps = {
  title: string;
  lines: string[];
};

export function HintOverlay({ title, lines }: HintOverlayProps): React.ReactElement {
  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      padding={1}
      gap={1}
    >
      <text>HINT — {title}</text>
      {lines.map((l, i) => (
        <text key={i}>{l}</text>
      ))}
      <text>[?] or [esc] to close</text>
    </box>
  );
}
```

- [ ] **Step 5: Verify**

Run: `bun test tests/components/HintOverlay.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ControlsHint.tsx src/components/HintOverlay.tsx tests/components/HintOverlay.test.tsx
git commit -m "feat(ui): ControlsHint and HintOverlay components"
```

---

# Phase 4 — Combat hook

## Task 15: useCombatEngine

This hook owns the per-keystroke evaluation, the state machine, and the strip animation timer.

**Files:**
- Create: `src/components/hooks/useCombatEngine.ts`
- Create: `tests/hooks/useCombatEngine.test.tsx`

Spec ref: §4.3, §5.6.

- [ ] **Step 1: Write the failing test (integration-style via renderTui)**

Create `tests/hooks/useCombatEngine.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import React, { useEffect, useState } from "react";
import { useCombatEngine } from "@/components/hooks/useCombatEngine";
import type { Monster } from "@/game/types";

afterEach(cleanup);

const monster: Monster = {
  id: "m", name: "M", portrait: "p", flavor: "",
  layers: [
    { topic: "L1", lines: [{ text: "alpha", vital: true }, { text: "beta", vital: true }] },
  ],
  heart: { text: "HEART" },
};

function Probe({ pattern }: { pattern: string }): React.ReactElement {
  const engine = useCombatEngine({ monster, stripDelayMs: 1 });
  const [reported, setReported] = useState("");
  useEffect(() => {
    engine.dismissIntro();
    engine.setPattern(pattern);
  }, [pattern, engine]);
  useEffect(() => {
    setReported(`phase:${engine.state.phase.kind} dmg:${engine.evalResult ? engine.evalResult.vitalsHit : "?"}`);
  }, [engine.state.phase.kind, engine.evalResult]);
  return <text>{reported}</text>;
}

describe("useCombatEngine", () => {
  test("perfect pattern transitions through strip into heart", async () => {
    const ui = renderTui(<Probe pattern="^(alpha|beta)$" />);
    await ui.waitFor("phase:heart");
    expect(ui.screen.contains("phase:heart")).toBe(true);
  });

  test("imperfect pattern stays in layerActive", async () => {
    const ui = renderTui(<Probe pattern="^alpha$" />);
    await new Promise((r) => setTimeout(r, 30));
    expect(ui.screen.contains("phase:layerActive")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/hooks/useCombatEngine.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/hooks/useCombatEngine.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { advance, initialState, type CombatState } from "@/game/combat";
import { computeDamage } from "@/game/damage";
import { evaluate } from "@/game/matcher";
import type { EvalResult, Monster } from "@/game/types";

export type CombatEngine = {
  state: CombatState;
  pattern: string;
  evalResult: EvalResult | null;
  damage: number;
  setPattern: (p: string) => void;
  dismissIntro: () => void;
  dismissKill: () => void;
};

export function useCombatEngine(opts: { monster: Monster; stripDelayMs?: number }): CombatEngine {
  const stripDelayMs = opts.stripDelayMs ?? 400;

  const [state, setState] = useState<CombatState>(() => initialState(opts.monster));
  const [pattern, setPattern] = useState("");

  const evalResult = useMemo<EvalResult | null>(() => {
    if (state.phase.kind === "layerActive" || state.phase.kind === "heart") {
      return evaluate({ pattern, monster: opts.monster, phase: state.phase });
    }
    return null;
  }, [pattern, state.phase, opts.monster]);

  const damage = useMemo(() => {
    if (!evalResult) return 0;
    return computeDamage({
      vitalsHit: evalResult.vitalsHit,
      vitalsTotal: evalResult.vitalsTotal,
      collateral: evalResult.collateral,
    });
  }, [evalResult]);

  // Trigger strip / kill on perfect
  useEffect(() => {
    if (!evalResult || !evalResult.perfect) return;
    setState((s) => advance(s, { kind: "perfectMatch", pattern }));
  }, [evalResult, pattern]);

  // Strip → layerActive/heart after the animation delay
  useEffect(() => {
    if (state.phase.kind !== "strip") return;
    const handle = setTimeout(() => {
      setState((s) => advance(s, { kind: "stripDone" }));
      setPattern(""); // clear input after a strip — fresh slate per layer
    }, stripDelayMs);
    return () => clearTimeout(handle);
  }, [state.phase, stripDelayMs]);

  const dismissIntro = useCallback(() => setState((s) => advance(s, { kind: "dismissIntro" })), []);
  const dismissKill = useCallback(() => setState((s) => advance(s, { kind: "dismissKill" })), []);

  return { state, pattern, evalResult, damage, setPattern, dismissIntro, dismissKill };
}
```

- [ ] **Step 4: Verify**

Run: `bun test tests/hooks/useCombatEngine.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/hooks/useCombatEngine.ts tests/hooks/useCombatEngine.test.tsx
git commit -m "feat(ui): useCombatEngine hook (per-keystroke eval + state machine)"
```

---

# Phase 5 — Screens

## Task 16: MenuScreen

**Files:**
- Create: `src/screens/MenuScreen.tsx`
- Create: `tests/screens/MenuScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/screens/MenuScreen.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { MenuScreen } from "@/screens/MenuScreen";

afterEach(cleanup);

describe("MenuScreen", () => {
  test("renders title and three options", () => {
    const ui = renderTui(<MenuScreen onSelect={() => {}} />);
    const text = ui.screen.text();
    expect(text).toContain("regxslayer");
    expect(text).toContain("Continue");
    expect(text).toContain("New Game");
    expect(text).toContain("Quit");
  });

  test("up/down + enter selects an item", async () => {
    let chosen = "";
    const ui = renderTui(<MenuScreen onSelect={(s) => (chosen = s)} />);
    ui.keys.press("down"); // Continue → New Game
    ui.keys.enter();
    expect(chosen).toBe("new");
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/screens/MenuScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/screens/MenuScreen.tsx`:

```tsx
import React, { useState } from "react";
import { useKeyboard } from "@gridland/utils";

export type MenuChoice = "continue" | "new" | "quit";
const ITEMS: { key: MenuChoice; label: string }[] = [
  { key: "continue", label: "Continue" },
  { key: "new", label: "New Game" },
  { key: "quit", label: "Quit" },
];

export type MenuScreenProps = {
  onSelect: (choice: MenuChoice) => void;
};

export function MenuScreen({ onSelect }: MenuScreenProps): React.ReactElement {
  const [idx, setIdx] = useState(0);
  useKeyboard((e) => {
    if (e.name === "up") setIdx((i) => (i + ITEMS.length - 1) % ITEMS.length);
    else if (e.name === "down") setIdx((i) => (i + 1) % ITEMS.length);
    else if (e.name === "return") onSelect(ITEMS[idx]!.key);
  }, { global: true });

  return (
    <box flexDirection="column" padding={2} gap={1}>
      <text>regxslayer</text>
      <text>───────────</text>
      {ITEMS.map((it, i) => (
        <text key={it.key}>{i === idx ? "▶ " : "  "}{it.label}</text>
      ))}
    </box>
  );
}
```

- [ ] **Step 4: Verify**

Run: `bun test tests/screens/MenuScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/MenuScreen.tsx tests/screens/MenuScreen.test.tsx
git commit -m "feat(screens): MenuScreen with up/down + enter selection"
```

---

## Task 17: ChapterSelectScreen

**Files:**
- Create: `src/screens/ChapterSelectScreen.tsx`
- Create: `tests/screens/ChapterSelectScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/screens/ChapterSelectScreen.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { ChapterSelectScreen } from "@/screens/ChapterSelectScreen";
import type { Chapter, SaveFile } from "@/game/types";

afterEach(cleanup);

const chapters: Chapter[] = [
  { id: "ch1", title: "Literals", intro: "", cheatsheet: [],
    monsters: [{ id: "a", name: "A", portrait: "p", flavor: "", layers: [], heart: { text: "" } }] },
  { id: "ch2", title: "Char Classes", intro: "", cheatsheet: [],
    monsters: [{ id: "b", name: "B", portrait: "p", flavor: "", layers: [], heart: { text: "" } }] },
];

const save: SaveFile = {
  version: 1, createdAt: "", updatedAt: "",
  chapters: { ch1: { monsters: { a: { slainAt: "x", bestRegexes: {} } } } },
};

describe("ChapterSelectScreen", () => {
  test("shows chapters with completion counts", () => {
    const ui = renderTui(<ChapterSelectScreen chapters={chapters} save={save} onPickMonster={() => {}} onBack={() => {}} />);
    const text = ui.screen.text();
    expect(text).toContain("Literals");
    expect(text).toContain("1/1 slain");
    expect(text).toContain("0/1 slain");
  });

  test("locked chapter is marked", () => {
    const empty: SaveFile = { version: 1, createdAt: "", updatedAt: "", chapters: {} };
    const ui = renderTui(<ChapterSelectScreen chapters={chapters} save={empty} onPickMonster={() => {}} onBack={() => {}} />);
    expect(ui.screen.contains("(locked)")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/screens/ChapterSelectScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/screens/ChapterSelectScreen.tsx`:

```tsx
import React, { useState } from "react";
import { useKeyboard } from "@gridland/utils";
import type { Chapter, SaveFile } from "@/game/types";

export type ChapterSelectProps = {
  chapters: Chapter[];
  save: SaveFile;
  onPickMonster: (chapterId: string, monsterId: string) => void;
  onBack: () => void;
};

export function ChapterSelectScreen({ chapters, save, onPickMonster, onBack }: ChapterSelectProps): React.ReactElement {
  // Flatten to a focusable list of (chapter, monster?) entries.
  const entries = chapters.flatMap((c, ci) => {
    const unlocked = ci === 0 || hasAnySlain(save, chapters[ci - 1]!.id);
    return c.monsters.map((m) => ({ chapter: c, monster: m, unlocked }));
  });

  const [idx, setIdx] = useState(0);
  useKeyboard((e) => {
    if (e.name === "up") setIdx((i) => (i + entries.length - 1) % entries.length);
    else if (e.name === "down") setIdx((i) => (i + 1) % entries.length);
    else if (e.name === "return") {
      const e2 = entries[idx]!;
      if (e2.unlocked) onPickMonster(e2.chapter.id, e2.monster.id);
    } else if (e.name === "escape") onBack();
  }, { global: true });

  // Group display
  return (
    <box flexDirection="column" padding={1} gap={0}>
      <text>Choose your fight  ([esc] back)</text>
      <text>──────────────────────────────</text>
      {chapters.map((c, ci) => {
        const unlocked = ci === 0 || hasAnySlain(save, chapters[ci - 1]!.id);
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
    </box>
  );
}

function isSlain(save: SaveFile, chapterId: string, monsterId: string): boolean {
  return Boolean(save.chapters[chapterId]?.monsters[monsterId]?.slainAt);
}

function hasAnySlain(save: SaveFile, chapterId: string): boolean {
  const ms = save.chapters[chapterId]?.monsters ?? {};
  return Object.values(ms).some((m) => Boolean(m.slainAt));
}
```

- [ ] **Step 4: Verify**

Run: `bun test tests/screens/ChapterSelectScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ChapterSelectScreen.tsx tests/screens/ChapterSelectScreen.test.tsx
git commit -m "feat(screens): ChapterSelectScreen with unlock rule and slain counts"
```

---

## Task 18: CombatScreen (the big one)

**Files:**
- Create: `src/screens/CombatScreen.tsx`
- Create: `tests/screens/CombatScreen.test.tsx`

Spec ref: §6.2 layout, §4.4 quit/hint.

- [ ] **Step 1: Write the failing test (smoke-level)**

Create `tests/screens/CombatScreen.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { CombatScreen } from "@/screens/CombatScreen";
import type { Chapter } from "@/game/types";

afterEach(cleanup);

const chapter: Chapter = {
  id: "ch", title: "Test", intro: "",
  cheatsheet: ["\\d  digit"],
  monsters: [{
    id: "m", name: "Mob", portrait: "scribblet", flavor: "",
    layers: [{ topic: "L1", lines: [{ text: "alpha", vital: true }] }],
    heart: { text: "HEART" },
  }],
};

describe("CombatScreen", () => {
  test("renders monster name, body, controls hint", async () => {
    const ui = renderTui(
      <CombatScreen
        chapter={chapter}
        monster={chapter.monsters[0]!}
        onKill={() => {}}
        onFlee={() => {}}
      />
    );
    // Press enter to dismiss intro.
    ui.keys.enter();
    await new Promise((r) => setTimeout(r, 5));
    const text = ui.screen.text();
    expect(text).toContain("Mob");
    expect(text).toContain("alpha");
    expect(text).toContain("[?] hint");
  });

  test("? toggles hint overlay", async () => {
    const ui = renderTui(
      <CombatScreen chapter={chapter} monster={chapter.monsters[0]!} onKill={() => {}} onFlee={() => {}} />
    );
    ui.keys.enter();
    await new Promise((r) => setTimeout(r, 5));
    ui.keys.press("?");
    await new Promise((r) => setTimeout(r, 5));
    expect(ui.screen.contains("HINT")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/screens/CombatScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/screens/CombatScreen.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import { useKeyboard } from "@gridland/utils";
import { BodyView } from "@/components/BodyView";
import { ControlsHint } from "@/components/ControlsHint";
import { FeedbackLine } from "@/components/FeedbackLine";
import { HintOverlay } from "@/components/HintOverlay";
import { HpBar } from "@/components/HpBar";
import { LayerRoadmap } from "@/components/LayerRoadmap";
import { MonsterPortrait } from "@/components/MonsterPortrait";
import { RegexInput } from "@/components/RegexInput";
import { useCombatEngine } from "@/components/hooks/useCombatEngine";
import type { Chapter, Monster, BestRegex } from "@/game/types";

export type CombatScreenProps = {
  chapter: Chapter;
  monster: Monster;
  onKill: (bestRegexes: Record<string, BestRegex>) => void;
  onFlee: () => void;
};

export function CombatScreen(props: CombatScreenProps): React.ReactElement {
  const { chapter, monster, onKill, onFlee } = props;
  const engine = useCombatEngine({ monster });
  const [hintOpen, setHintOpen] = useState(false);

  // Forward kill to parent
  useEffect(() => {
    if (engine.state.phase.kind === "kill") {
      onKill(engine.state.bestRegexes);
    }
  }, [engine.state.phase, engine.state.bestRegexes, onKill]);

  useKeyboard((e) => {
    if (engine.state.phase.kind === "intro" && e.name === "return") {
      engine.dismissIntro();
      return;
    }
    if (e.name === "?") {
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
  const hpPercent = ((engine.state.layersStripped.length + heartProgress) / (totalLayers + 1)) * 100;

  const inHeart = engine.state.phase.kind === "heart" || engine.state.phase.kind === "kill";
  const activeIdx =
    engine.state.phase.kind === "layerActive" ? engine.state.phase.layerIdx :
    engine.state.phase.kind === "strip"        ? engine.state.phase.layerIdx :
    Math.max(0, totalLayers - 1);

  if (engine.state.phase.kind === "intro") {
    return (
      <box flexDirection="column" padding={2} gap={1} alignItems="center">
        <MonsterPortrait name={monster.portrait} />
        <text>{monster.name}</text>
        <text>{monster.flavor}</text>
        <text>[⏎] begin</text>
      </box>
    );
  }

  return (
    <box flexDirection="row" flexGrow={1}>
      {/* Sidebar */}
      <box flexDirection="column" padding={1} width={28} gap={1}>
        <text>{chapter.title}</text>
        <MonsterPortrait name={monster.portrait} />
        <text>{monster.name}</text>
        <HpBar percent={hpPercent} max={100} />
        <LayerRoadmap
          topics={monster.layers.map((l) => l.topic)}
          activeIdx={activeIdx}
          strippedIdxs={engine.state.layersStripped}
          inHeart={inHeart}
        />
        <ControlsHint />
      </box>
      {/* Arena */}
      <box flexDirection="column" flexGrow={1} padding={1} gap={1}>
        <BodyView
          monster={monster}
          activeLayerIdx={activeIdx}
          strippedIdxs={engine.state.layersStripped}
          inHeart={inHeart}
          matchedKeys={engine.evalResult?.matchedLineKeys ?? new Set<string>()}
        />
        {hintOpen ? (
          <HintOverlay title={chapter.title} lines={chapter.cheatsheet} />
        ) : (
          <>
            <RegexInput
              value={engine.pattern}
              onChange={(p) => engine.setPattern(p)}
              invalid={engine.evalResult?.invalid}
            />
            <FeedbackLine
              vitalsHit={engine.evalResult?.vitalsHit ?? 0}
              vitalsTotal={engine.evalResult?.vitalsTotal ?? 0}
              collateral={engine.evalResult?.collateral ?? 0}
              damage={engine.damage}
            />
          </>
        )}
      </box>
    </box>
  );
}
```

- [ ] **Step 4: Verify**

Run: `bun test tests/screens/CombatScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/CombatScreen.tsx tests/screens/CombatScreen.test.tsx
git commit -m "feat(screens): CombatScreen — split layout combining all combat components"
```

---

## Task 19: VictoryScreen

**Files:**
- Create: `src/screens/VictoryScreen.tsx`
- Create: `tests/screens/VictoryScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/screens/VictoryScreen.test.tsx`:

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { renderTui, cleanup } from "@gridland/testing";
import { VictoryScreen } from "@/screens/VictoryScreen";

afterEach(cleanup);

describe("VictoryScreen", () => {
  test("shows monster name and 'press ⏎'", () => {
    const ui = renderTui(<VictoryScreen monsterName="Grimtooth" onContinue={() => {}} />);
    expect(ui.screen.contains("Grimtooth")).toBe(true);
    expect(ui.screen.contains("press ⏎")).toBe(true);
  });

  test("enter calls onContinue", () => {
    let called = false;
    const ui = renderTui(<VictoryScreen monsterName="X" onContinue={() => (called = true)} />);
    ui.keys.enter();
    expect(called).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/screens/VictoryScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/screens/VictoryScreen.tsx`:

```tsx
import React from "react";
import { useKeyboard } from "@gridland/utils";

export type VictoryScreenProps = {
  monsterName: string;
  onContinue: () => void;
};

export function VictoryScreen({ monsterName, onContinue }: VictoryScreenProps): React.ReactElement {
  useKeyboard((e) => {
    if (e.name === "return") onContinue();
  }, { global: true });

  return (
    <box flexDirection="column" padding={2} gap={1} alignItems="center">
      <text>VICTORY</text>
      <text>{monsterName} has fallen.</text>
      <text>───────────────</text>
      <text>press ⏎ to continue</text>
    </box>
  );
}
```

- [ ] **Step 4: Verify**

Run: `bun test tests/screens/VictoryScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/VictoryScreen.tsx tests/screens/VictoryScreen.test.tsx
git commit -m "feat(screens): VictoryScreen"
```

---

# Phase 6 — App router + cli wiring

## Task 20: App router

**Files:**
- Modify: `src/app.tsx` (replace placeholder entirely)

Spec ref: §4.1, §6.1.

- [ ] **Step 1: Replace src/app.tsx**

```tsx
import React, { useState } from "react";
import { chapters as ALL_CHAPTERS } from "@/content/chapters";
import { ChapterSelectScreen } from "@/screens/ChapterSelectScreen";
import { CombatScreen } from "@/screens/CombatScreen";
import { MenuScreen, type MenuChoice } from "@/screens/MenuScreen";
import { VictoryScreen } from "@/screens/VictoryScreen";
import { loadSave, recordKill } from "@/game/progress";
import type { SaveFile } from "@/game/types";

type Route =
  | { kind: "menu" }
  | { kind: "select" }
  | { kind: "combat"; chapterId: string; monsterId: string }
  | { kind: "victory"; chapterId: string; monsterId: string };

export function App(): React.ReactElement {
  const [save, setSave] = useState<SaveFile>(() => loadSave());
  const [route, setRoute] = useState<Route>({ kind: "menu" });
  const [progressUnwritable, setProgressUnwritable] = useState(false);

  const findMonster = (chapterId: string, monsterId: string) => {
    const chapter = ALL_CHAPTERS.find((c) => c.id === chapterId)!;
    return { chapter, monster: chapter.monsters.find((m) => m.id === monsterId)! };
  };

  const screen: React.ReactElement = (() => {
    if (route.kind === "menu") {
      return (
        <MenuScreen
          onSelect={(c: MenuChoice) => {
            if (c === "quit") process.exit(0);
            setRoute({ kind: "select" });
          }}
        />
      );
    }
    if (route.kind === "select") {
      return (
        <ChapterSelectScreen
          chapters={ALL_CHAPTERS}
          save={save}
          onPickMonster={(chapterId, monsterId) => setRoute({ kind: "combat", chapterId, monsterId })}
          onBack={() => setRoute({ kind: "menu" })}
        />
      );
    }
    if (route.kind === "combat") {
      const { chapter, monster } = findMonster(route.chapterId, route.monsterId);
      return (
        <CombatScreen
          chapter={chapter}
          monster={monster}
          onKill={(bestRegexes) => {
            const result = recordKill(save, {
              chapterId: chapter.id,
              monsterId: monster.id,
              bestRegexes,
            });
            setSave(result.save);
            if (!result.persisted) setProgressUnwritable(true);
            setRoute({ kind: "victory", chapterId: chapter.id, monsterId: monster.id });
          }}
          onFlee={() => setRoute({ kind: "select" })}
        />
      );
    }
    // victory
    const { monster } = findMonster(route.chapterId, route.monsterId);
    return (
      <VictoryScreen
        monsterName={monster.name}
        onContinue={() => setRoute({ kind: "select" })}
      />
    );
  })();

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexGrow={1}>{screen}</box>
      {progressUnwritable ? <text>⚠ progress not saved</text> : null}
    </box>
  );
}
```

- [ ] **Step 2: Typecheck and run all tests**

Run: `bun run typecheck && bun test`
Expected: typecheck clean; tests still passing.

- [ ] **Step 3: Smoke-run**

Run: `bun run dev`
Expected: menu → select → combat → kill (with `^(hello|world)$` then `^(alpha|beta)$` then `^INK_HEART_42$`) → victory → back to select. Press Ctrl-C to exit.

If smoke fails, capture the failure mode (rendering glitch, key not received, crash) and fix it inside the relevant component before committing — do not commit a non-working router.

- [ ] **Step 4: Commit**

```bash
git add src/app.tsx
git commit -m "feat(app): wire screens together with route state and save persistence"
```

---

## Task 21: cli.tsx — terminal-too-small guard, signals, NO_COLOR awareness

**Files:**
- Modify: `src/cli.tsx`

Spec ref: §9 (resize, signals, NO_COLOR).

- [ ] **Step 1: Replace src/cli.tsx**

```tsx
#!/usr/bin/env bun
import React from "react";
import { createCliRenderer, createRoot } from "@gridland/bun";
import { useTerminalDimensions } from "@gridland/utils";
import { App } from "./app";

const MIN_COLS = 100;
const MIN_ROWS = 30;

function Root(): React.ReactElement {
  const { width, height } = useTerminalDimensions();
  if (width < MIN_COLS || height < MIN_ROWS) {
    return (
      <box flexDirection="column" padding={2} alignItems="center" justifyContent="center">
        <text>regxslayer needs at least {MIN_COLS}×{MIN_ROWS}.</text>
        <text>Currently {width}×{height} — please resize your terminal.</text>
      </box>
    );
  }
  return <App />;
}

async function main(): Promise<void> {
  // NO_COLOR awareness: if set, set a global flag the components can read.
  // Components currently use only glyph differentiation, so colors degrade
  // gracefully even without explicit checks. We still record the env so future
  // styling can branch on it.
  process.env["REGXSLAYER_NO_COLOR"] = process.env["NO_COLOR"] ? "1" : "";

  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  const cleanup = (): void => {
    try { renderer.destroy(); } catch { /* ignore */ }
  };
  process.on("SIGINT", () => { cleanup(); process.exit(130); });
  process.on("SIGTERM", () => { cleanup(); process.exit(143); });

  const root = createRoot(renderer);
  root.render(<Root />);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke-run, then resize the terminal below 100×30 and verify the prompt appears**

Run: `bun run dev`
Manually shrink the terminal to ~80×20.
Expected: the resize prompt appears live; restoring size brings back the menu.

- [ ] **Step 3: Run all tests**

Run: `bun test`
Expected: all passing (resize behavior is not unit-tested; that's a manual smoke).

- [ ] **Step 4: Commit**

```bash
git add src/cli.tsx
git commit -m "feat(cli): terminal-size guard, SIGINT/SIGTERM cleanup, NO_COLOR flag"
```

---

# Phase 7 — Real content (full v1)

These three tasks replace the placeholder with the full 12-monster campaign. Each task creates a chapter file with 4 monsters and adds portraits.

**Authoring guide for monster content** (apply to every monster you write below):

- 2–3 layers per monster, each layer ≤ 8 lines, ≥ 1 vital per layer.
- Heart = a single distinctive string (length ≥ 3, not all same char).
- The validator's `trivial-killer` check requires that `.+`, `.*`, `\w+`, `\S+` all over-match somewhere in every layer. Easiest way to ensure this: include at least one filler line in every layer that the trivial pattern would match.
- Layer order goes from easier topic to harder within a chapter; vitals should be solvable by the chapter's named topic (the player should learn the topic by playing).
- The first monster of chapter 1 (`scribblet`) is the tutorial — keep its layers small and obvious; its flavor mentions which keys to press.

## Task 22: Chapter 1 — Literals & Anchors (4 monsters, real)

**Files:**
- Modify: `src/content/chapter-1-literals.ts` (replace entirely)
- Modify: `src/content/portraits.ts` (add 3 more portraits)

- [ ] **Step 1: Add portraits**

Replace `src/content/portraits.ts`:

```ts
export const portraits: Record<string, string[]> = {
  scribblet: [
    "  ,---,  ",
    " ( o.o ) ",
    "  \\___/  ",
  ],
  caretling: [
    "   ^^^   ",
    "  /. .\\  ",
    "  \\___/  ",
  ],
  pinmeister: [
    "  |---|  ",
    "  | $ |  ",
    "  '---'  ",
  ],
  alternaut: [
    "  /-|-\\  ",
    " ( o|o ) ",
    "  \\-|-/  ",
  ],
};
```

- [ ] **Step 2: Replace chapter-1**

Create `src/content/chapter-1-literals.ts` (replace existing):

```ts
import type { Chapter } from "@/game/types";

export const chapter: Chapter = {
  id: "literals-anchors",
  title: "Literals & Anchors",
  intro: "First steps: match exact text, use ^ and $ to pin where you mean.",
  cheatsheet: [
    "abc       matches the literal text 'abc'",
    "^abc      matches 'abc' only at line start",
    "abc$      matches 'abc' only at line end",
    "^abc$     matches lines that are exactly 'abc'",
    "a|b       matches 'a' or 'b'",
    "(...)     groups; useful with |",
  ],
  monsters: [
    {
      id: "scribblet",
      name: "Scribblet the Inkblot",
      portrait: "scribblet",
      flavor: "Type a regex below. Press [?] for help, [esc] to flee. Keys are live — every keystroke counts.",
      layers: [
        {
          topic: "exact words",
          lines: [
            { text: "hello",        vital: true  },
            { text: "world",        vital: true  },
            { text: "hello world",  vital: false },
            { text: "say hello",    vital: false },
          ],
        },
      ],
      heart: { text: "INK_HEART_42" },
    },
    {
      id: "caretling",
      name: "Caretling",
      portrait: "caretling",
      flavor: "Loves pretending it owns the start of every line.",
      layers: [
        {
          topic: "anchored start",
          lines: [
            { text: "alpha",       vital: true  },
            { text: "alphabet",    vital: false },
            { text: "Italphabet",  vital: false },
            { text: "alpine",      vital: true  },
          ],
        },
        {
          topic: "anchored end",
          lines: [
            { text: "running",     vital: true  },
            { text: "swimming",    vital: true  },
            { text: "ringing",     vital: false },
            { text: "ingredient",  vital: false },
          ],
        },
      ],
      heart: { text: "ANCHOR_LORD_007" },
    },
    {
      id: "pinmeister",
      name: "Pinmeister",
      portrait: "pinmeister",
      flavor: "Demands you pin it exactly.",
      layers: [
        {
          topic: "exact lines",
          lines: [
            { text: "ok",          vital: true  },
            { text: "go",          vital: true  },
            { text: "okay",        vital: false },
            { text: "going",       vital: false },
            { text: "stop",        vital: false },
          ],
        },
        {
          topic: "exact lines harder",
          lines: [
            { text: "north",       vital: true  },
            { text: "south",       vital: true  },
            { text: "northwest",   vital: false },
            { text: "southbound",  vital: false },
          ],
        },
      ],
      heart: { text: "PIN_OF_DOOM" },
    },
    {
      id: "alternaut",
      name: "Alternaut",
      portrait: "alternaut",
      flavor: "Splits in two — match either half cleanly.",
      layers: [
        {
          topic: "alternation",
          lines: [
            { text: "cat",         vital: true  },
            { text: "dog",         vital: true  },
            { text: "catalog",     vital: false },
            { text: "dogged",      vital: false },
            { text: "horse",       vital: false },
          ],
        },
        {
          topic: "grouped alternation",
          lines: [
            { text: "v1",          vital: true  },
            { text: "v2",          vital: true  },
            { text: "v3",          vital: true  },
            { text: "v10",         vital: false },
            { text: "verse",       vital: false },
          ],
        },
      ],
      heart: { text: "ALT_FUSION_X" },
    },
  ],
};
```

- [ ] **Step 3: Run validator and tests**

Run: `bun run validate-content`
Expected: `✓ 1 chapter(s) validated, no issues.`

Run: `bun test`
Expected: all passing.

- [ ] **Step 4: Smoke-play chapter 1**

Run: `bun run dev`
Navigate to chapter 1. Beat all 4 monsters. The kill regexes shown in cheatsheet should work, e.g. `^(hello|world)$`, `^al`, `^(north|south)$`, `^(cat|dog)$`. Hearts: `^INK_HEART_42$`, `^ANCHOR_LORD_007$`, `^PIN_OF_DOOM$`, `^ALT_FUSION_X$`.

- [ ] **Step 5: Commit**

```bash
git add src/content/chapter-1-literals.ts src/content/portraits.ts
git commit -m "feat(content): chapter 1 — literals & anchors (4 monsters)"
```

---

## Task 23: Chapter 2 — Character Classes (4 monsters)

**Files:**
- Create: `src/content/chapter-2-charclasses.ts`
- Modify: `src/content/portraits.ts`
- Modify: `src/content/chapters.ts`

- [ ] **Step 1: Add portraits**

Replace `src/content/portraits.ts` (keep chapter-1 entries, add new):

```ts
export const portraits: Record<string, string[]> = {
  scribblet:  ["  ,---,  ", " ( o.o ) ", "  \\___/  "],
  caretling:  ["   ^^^   ", "  /. .\\  ", "  \\___/  "],
  pinmeister: ["  |---|  ", "  | $ |  ", "  '---'  "],
  alternaut:  ["  /-|-\\  ", " ( o|o ) ", "  \\-|-/  "],
  digiton:    ["  [123]  ", "  /0 0\\  ", "  \\_8_/  "],
  worderly:   ["  {abc}  ", "  /a a\\  ", "  \\___/  "],
  spaceblob:  ["  ~~~~~  ", "  ' '    ", "         "],
  rangewolf:  ["  /a-z\\  ", " (•   •) ", "  \\___/  "],
};
```

- [ ] **Step 2: Create chapter-2**

```ts
import type { Chapter } from "@/game/types";

export const chapter: Chapter = {
  id: "char-classes",
  title: "Character Classes",
  intro: "Letters, digits, whitespace, ranges. Stop spelling everything out.",
  cheatsheet: [
    "\\d  any digit       \\D  non-digit",
    "\\w  word char       \\W  non-word",
    "\\s  whitespace      \\S  non-ws",
    "[abc]  any of a,b,c  [^abc]  none of",
    "[a-z]  range",
  ],
  monsters: [
    {
      id: "digiton",
      name: "Digiton",
      portrait: "digiton",
      flavor: "Made entirely of digits. Ironic, isn't it.",
      layers: [
        {
          topic: "digits only",
          lines: [
            { text: "404",         vital: true  },
            { text: "200",         vital: true  },
            { text: "3.14",        vital: false },
            { text: "v3",          vital: false },
            { text: "abc",         vital: false },
          ],
        },
        {
          topic: "longer digit runs",
          lines: [
            { text: "8675309",     vital: true  },
            { text: "1024",        vital: true  },
            { text: "x42",         vital: false },
            { text: "12-12",       vital: false },
          ],
        },
      ],
      heart: { text: "DIGIT_BOSS_99" },
    },
    {
      id: "worderly",
      name: "Worderly",
      portrait: "worderly",
      flavor: "Fond of underscores. Probably writes Python.",
      layers: [
        {
          topic: "word chars",
          lines: [
            { text: "snake_case",  vital: true  },
            { text: "camelCase",   vital: true  },
            { text: "kebab-case",  vital: false },
            { text: "spaced out",  vital: false },
            { text: "punct!",      vital: false },
          ],
        },
        {
          topic: "non-word chars",
          lines: [
            { text: "@#!$",        vital: true  },
            { text: "...",         vital: true  },
            { text: "abc",         vital: false },
            { text: "ab_cd",       vital: false },
          ],
        },
      ],
      heart: { text: "WORD_SOUL_X" },
    },
    {
      id: "spaceblob",
      name: "Spaceblob",
      portrait: "spaceblob",
      flavor: "Soft, breathy, full of nothing.",
      layers: [
        {
          topic: "leading whitespace",
          lines: [
            { text: "    indented",      vital: true  },
            { text: "\tindented",        vital: true  },
            { text: "no_indent",         vital: false },
            { text: "x   trailing   ",   vital: false },
          ],
        },
        {
          topic: "non-whitespace runs",
          lines: [
            { text: "abc",               vital: true  },
            { text: "xyz123",            vital: true  },
            { text: "  spaces  inside",  vital: false },
            { text: "  ",                vital: false },
          ],
        },
      ],
      heart: { text: "VOID_TOKEN" },
    },
    {
      id: "rangewolf",
      name: "Rangewolf",
      portrait: "rangewolf",
      flavor: "Hunts in lowercase territory.",
      layers: [
        {
          topic: "lowercase only",
          lines: [
            { text: "lowercase",       vital: true  },
            { text: "another",         vital: true  },
            { text: "Capitalized",     vital: false },
            { text: "MIXED1",          vital: false },
            { text: "x42",             vital: false },
          ],
        },
        {
          topic: "negated set",
          lines: [
            { text: "alpha",           vital: true  },
            { text: "beta",            vital: true  },
            { text: "alpha_x",         vital: false },
            { text: "beta-99",         vital: false },
          ],
        },
      ],
      heart: { text: "RANGE_FANG_07" },
    },
  ],
};
```

- [ ] **Step 3: Update chapters index**

Replace `src/content/chapters.ts`:

```ts
import type { Chapter } from "@/game/types";
import { chapter as chapter1 } from "./chapter-1-literals";
import { chapter as chapter2 } from "./chapter-2-charclasses";

export const chapters: Chapter[] = [chapter1, chapter2];
```

- [ ] **Step 4: Validate and test**

Run: `bun run validate-content && bun test`
Expected: 2 chapters validated, all tests pass.

- [ ] **Step 5: Smoke-play chapter 2**

Run: `bun run dev` and play through chapter 2. Suggested winning regexes (one per layer): `^\d+$`, `^\d{4,}$`, `^\w+$`, `^\W+$`, `^\s`, `^\S+$`, `^[a-z]+$`, `^[^_-]+$`. Hearts: `^DIGIT_BOSS_99$` etc.

- [ ] **Step 6: Commit**

```bash
git add src/content/chapter-2-charclasses.ts src/content/portraits.ts src/content/chapters.ts
git commit -m "feat(content): chapter 2 — character classes (4 monsters)"
```

---

## Task 24: Chapter 3 — Quantifiers (4 monsters)

**Files:**
- Create: `src/content/chapter-3-quantifiers.ts`
- Modify: `src/content/portraits.ts`
- Modify: `src/content/chapters.ts`

- [ ] **Step 1: Add portraits**

Replace `src/content/portraits.ts`:

```ts
export const portraits: Record<string, string[]> = {
  scribblet:  ["  ,---,  ", " ( o.o ) ", "  \\___/  "],
  caretling:  ["   ^^^   ", "  /. .\\  ", "  \\___/  "],
  pinmeister: ["  |---|  ", "  | $ |  ", "  '---'  "],
  alternaut:  ["  /-|-\\  ", " ( o|o ) ", "  \\-|-/  "],
  digiton:    ["  [123]  ", "  /0 0\\  ", "  \\_8_/  "],
  worderly:   ["  {abc}  ", "  /a a\\  ", "  \\___/  "],
  spaceblob:  ["  ~~~~~  ", "  ' '    ", "         "],
  rangewolf:  ["  /a-z\\  ", " (•   •) ", "  \\___/  "],
  starfist:   ["  *_*    ", " /***\\   ", "  v v    "],
  pluson:     ["  +++    ", " (^_^)   ", "  \\_/    "],
  questling:  ["  ?_?    ", " /. .\\   ", "  \\?/    "],
  bracetron:  ["  {n,m}  ", "  /OO\\   ", "  \\__/   "],
};
```

- [ ] **Step 2: Create chapter-3**

```ts
import type { Chapter } from "@/game/types";

export const chapter: Chapter = {
  id: "quantifiers",
  title: "Quantifiers",
  intro: "How much, how many. *, +, ?, {n}, {n,m} — pick the right repeater.",
  cheatsheet: [
    "x*       zero or more x",
    "x+       one or more x",
    "x?       zero or one x",
    "x{n}     exactly n",
    "x{n,m}   between n and m",
    "x{n,}    at least n",
  ],
  monsters: [
    {
      id: "starfist",
      name: "Starfist",
      portrait: "starfist",
      flavor: "Hits with zero or more punches.",
      layers: [
        {
          topic: "zero-or-more",
          lines: [
            { text: "ab",          vital: true  },
            { text: "aab",         vital: true  },
            { text: "aaab",        vital: true  },
            { text: "abc",         vital: false },
            { text: "b",           vital: true  }, // a* allows zero a's
          ],
        },
      ],
      heart: { text: "STAR_GUTS_01" },
    },
    {
      id: "pluson",
      name: "Pluson",
      portrait: "pluson",
      flavor: "Demands at least one of you.",
      layers: [
        {
          topic: "one-or-more",
          lines: [
            { text: "9",           vital: true  },
            { text: "42",          vital: true  },
            { text: "1234",        vital: true  },
            { text: "no digits",   vital: false },
            { text: "v3",          vital: false },
          ],
        },
        {
          topic: "longer runs",
          lines: [
            { text: "aaaaa",       vital: true  },
            { text: "aaa",         vital: true  },
            { text: "ab",          vital: false },
            { text: "bbb",         vital: false },
          ],
        },
      ],
      heart: { text: "PLUS_CORE_55" },
    },
    {
      id: "questling",
      name: "Questling",
      portrait: "questling",
      flavor: "Optional, but oh so important.",
      layers: [
        {
          topic: "zero-or-one",
          lines: [
            { text: "color",       vital: true  },
            { text: "colour",      vital: true  },
            { text: "colors",      vital: false },
            { text: "colourful",   vital: false },
          ],
        },
        {
          topic: "optional groups",
          lines: [
            { text: "http",        vital: true  },
            { text: "https",       vital: true  },
            { text: "httpz",       vital: false },
            { text: "shttp",       vital: false },
          ],
        },
      ],
      heart: { text: "OPT_HEART_99" },
    },
    {
      id: "bracetron",
      name: "Bracetron",
      portrait: "bracetron",
      flavor: "Counts. Precisely. Don't be off by one.",
      layers: [
        {
          topic: "exact counts",
          lines: [
            { text: "abc",         vital: true  },
            { text: "xyz",         vital: true  },
            { text: "ab",          vital: false },
            { text: "abcd",        vital: false },
            { text: "xy",          vital: false },
          ],
        },
        {
          topic: "ranged counts",
          lines: [
            { text: "aaa",         vital: true  },
            { text: "aaaa",        vital: true  },
            { text: "aaaaa",       vital: true  },
            { text: "aa",          vital: false },
            { text: "aaaaaa",      vital: false },
          ],
        },
      ],
      heart: { text: "BRACE_HEART_3X" },
    },
  ],
};
```

- [ ] **Step 3: Update chapters index**

Replace `src/content/chapters.ts`:

```ts
import type { Chapter } from "@/game/types";
import { chapter as chapter1 } from "./chapter-1-literals";
import { chapter as chapter2 } from "./chapter-2-charclasses";
import { chapter as chapter3 } from "./chapter-3-quantifiers";

export const chapters: Chapter[] = [chapter1, chapter2, chapter3];
```

- [ ] **Step 4: Validate and test**

Run: `bun run validate-content && bun test`
Expected: 3 chapters validated, all tests pass.

- [ ] **Step 5: Smoke-play chapter 3**

Run: `bun run dev`. Try: `^a*b$`, `^\d+$`, `^a+$`, `^colou?r$`, `^https?$`, `^\w{3}$`, `^a{3,5}$`. Hearts as written.

- [ ] **Step 6: Commit**

```bash
git add src/content/chapter-3-quantifiers.ts src/content/portraits.ts src/content/chapters.ts
git commit -m "feat(content): chapter 3 — quantifiers (4 monsters)"
```

---

# Phase 8 — Polish

## Task 25: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

Write the following to `README.md` (the four-backtick fence below is just for this plan; the file itself only contains the body — `# regxslayer` through `regxslayer is fully offline. It opens no network sockets.`):

````markdown
# regxslayer

A terminal regex-practice game. Each monster is a layered text body — write a
regex that surgically matches the right strings to peel layers, then strike the
heart for the kill.

## Install

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

To build a standalone binary (no Bun required at runtime):

```bash
bun run build
./dist/regxslayer
```

## Controls

- Type to write your regex. Highlights and damage update on every keystroke.
- A layer auto-strips when your regex matches **only** its vital lines.
- `?` — toggle hint cheatsheet for the current chapter
- `esc` — flee combat (back to chapter select) or close hints
- `↑`/`↓`/`⏎` — navigate menus
- `Ctrl-C` — quit

## Saves

Progress is saved to `~/.regxslayer/save.json` (or
`$XDG_DATA_HOME/regxslayer/save.json` on Linux when set). Slay one monster in a
chapter to unlock the next chapter.

## No telemetry

regxslayer is fully offline. It opens no network sockets.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with install, controls, save location, no-telemetry note"
```

---

## Task 26: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create workflow**

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install
        run: bun install --frozen-lockfile
      - name: Typecheck
        run: bun run typecheck
      - name: Test
        run: bun test
      - name: Validate content
        run: bun run validate-content
      - name: Build (smoke)
        run: bun build --compile src/cli.tsx --outfile dist/regxslayer
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: bun install + typecheck + test + validate + smoke build"
```

---

## Task 27: Final verification

- [ ] **Step 1: Full clean run**

Run:
```bash
bun install
bun run typecheck
bun test
bun run validate-content
bun run build
```
Expected: all green, `dist/regxslayer` exists.

- [ ] **Step 2: Full smoke playthrough**

Run: `./dist/regxslayer`
Walk through: menu → new game → chapter 1 monster 1 → kill → victory → chapter 1 monster 2 → kill → check chapter 2 unlocks → quit, restart binary, verify save persisted.

- [ ] **Step 3: Tag**

```bash
git tag v0.1.0
```

(No push; user will decide when to publish.)

---

# Self-review record

This plan was self-reviewed for: spec coverage (every section of the spec is implemented in at least one task), placeholder scan (no TBDs, all code blocks complete), type consistency (`EvalResult`, `CombatState`, `Monster`, `BestRegex` referenced consistently across tasks), and trivial-killer authoring guidance (every chapter task includes a layer-design rule explaining how to satisfy the validator).

The only spec details intentionally not implemented as separate tasks:
- Strip animation visuals beyond the 400ms input freeze (the freeze + state advance are implemented in `useCombatEngine`; richer animation is left to follow-up polish).
- ASCII portraits for all 12 monsters use simple shapes; an artist pass is welcome.
- Per-chapter color palette tuning — the components currently use no explicit colors, so output remains readable on any terminal. Coloring can be added later via `textStyle` from `@gridland/ui`.
