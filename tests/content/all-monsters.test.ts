import { describe, expect, test } from "bun:test";
import { allMonsters, storyChapters } from "@/content";
import { evaluate } from "@/game/matcher";
import type { Monster } from "@/game/types";
import { validateMonster } from "@/../scripts/validate-content";

const canonicalSolutions: Record<string, string[]> = {
  scribblet: ["^(hello|world)$"],
  caretling: ["^alp", "ing$"],
  pinmeister: ["^(ok|go)$", "^(north|south)$"],
  alternaut: ["^(cat|dog)$", "^v(1|2|3)$"],
  digiton: ["^\\d+$", "\\d{4,}"],
  worderly: ["^\\w+$", "^\\W+$"],
  spaceblob: ["^\\s", "^\\S+$"],
  rangewolf: ["^[a-z]+$", "^[^_0-9-]+$"],
  starfist: ["^a*b$"],
  pluson: ["^\\d+$", "^a+$"],
  questling: ["^colou?r$", "^https?$"],
  bracetron: ["^[A-Z]{3}$", "^a{3,5}$"],
  "tut-lump": ["hello", "^cat$"],
  "tut-pip": ["^\\d+$", "^\\w+$", "^\\s"],
  "tut-bop": ["^a*b$", "^a+$", "^colou?r$"],
  dotgrim: ["\\d\\.\\d", "^[a-z]+\\.[a-z]+$"],
};

const naivePatterns = ["\\w+", "\\d+", "\\s+", "[a-z]+", "[A-Z]+", ".+", ".*", "^\\w+$", "^\\d+$", "^\\s", "^\\S+$", "^.+$", "^[a-z]+$", "^[A-Z]+$"];

function escapeLiteral(text: string): string {
  return text.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function substrings(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i <= text.length - size; i++) out.push(text.slice(i, i + size));
  return out;
}

function commonSubstrings(vitals: string[], size: number): string[] {
  let common = new Set(substrings(vitals[0] ?? "", size));
  for (const vital of vitals.slice(1)) {
    const next = new Set(substrings(vital, size));
    common = new Set([...common].filter((s) => next.has(s)));
  }
  return [...common];
}

function shortcutCandidates(monster: Monster, layerIdx: number): string[] {
  const layer = monster.layers[layerIdx]!;
  const vitals = layer.lines.filter((l) => l.vital).map((l) => l.text);
  const chars = [...new Set(vitals.flatMap((v) => [...v]))].map(escapeLiteral);
  const shortSubstrings = [2, 3].flatMap((size) => commonSubstrings(vitals, size).map(escapeLiteral));
  return [...new Set([...chars, ...shortSubstrings, ...naivePatterns])];
}

function suggestedPattern(coaching?: string): string | null {
  return coaching?.match(/(?:Try(?: typing)?|Now try):\s*([^—]+?)\s*(?:—|$)/)?.[1]?.trim() ?? null;
}

describe("all monster content passes the validator", () => {
  for (const m of allMonsters) {
    test(`${m.pool}/${m.id} passes (errors only)`, () => {
      const errors = validateMonster(m).filter((i) => i.severity === "error");
      expect(errors).toEqual([]);
    });
  }
});

describe("monster pool composition", () => {
  test("storyChapters has 3 chapters of 4 monsters each", () => {
    expect(storyChapters.length).toBe(3);
    for (const c of storyChapters) {
      expect(c.monsters.length).toBe(4);
    }
  });
  test("allMonsters covers story + tutorial + wild", () => {
    const pools = new Set(allMonsters.map((m) => m.pool));
    expect(pools.has("story")).toBe(true);
    expect(pools.has("tutorial")).toBe(true);
    expect(pools.has("wild")).toBe(true);
  });
});

describe("monster content design integrity", () => {
  for (const monster of allMonsters) {
    const solutions = canonicalSolutions[monster.id] ?? [];

    for (let layerIdx = 0; layerIdx < monster.layers.length; layerIdx++) {
      test(`${monster.id}/L${layerIdx} canonical solution strips cleanly`, () => {
        const pattern = solutions[layerIdx];
        if (pattern === undefined) {
          throw new Error(`missing canonical solution for ${monster.id}/L${layerIdx}`);
        }
        const result = evaluate({ monster, pattern, phase: { kind: "layerActive", layerIdx } });
        expect(result.perfect).toBe(true);
      });

      test(`${monster.id}/L${layerIdx} generic shortcut candidates do not strip`, () => {
        const canonical = solutions[layerIdx];
        const leaks = shortcutCandidates(monster, layerIdx).filter((pattern) => {
          if (pattern === canonical) return false;
          const result = evaluate({ monster, pattern, phase: { kind: "layerActive", layerIdx } });
          return result.perfect;
        });
        expect(leaks).toEqual([]);
      });
    }

    test(`${monster.id} heart kill is exact and uncontaminated`, () => {
      const pattern = `^${escapeLiteral(monster.heart.text)}$`;
      const result = evaluate({ monster, pattern, phase: { kind: "heart" } });
      expect(result.perfect).toBe(true);
    });
  }

  for (const monster of allMonsters.filter((m) => m.pool === "tutorial")) {
    for (let layerIdx = 0; layerIdx < monster.layers.length; layerIdx++) {
      test(`${monster.id}/L${layerIdx} suggested regex does not strip early while typing`, () => {
        const suggested = suggestedPattern(monster.layers[layerIdx]?.coaching);
        if (!suggested) return;
        const earlyPerfect = [];
        for (let i = 1; i < suggested.length; i++) {
          const pattern = suggested.slice(0, i);
          const result = evaluate({ monster, pattern, phase: { kind: "layerActive", layerIdx } });
          if (result.perfect) earlyPerfect.push(pattern);
        }
        expect(earlyPerfect).toEqual([]);
      });
    }
  }
});
