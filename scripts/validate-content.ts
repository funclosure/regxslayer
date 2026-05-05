#!/usr/bin/env bun
import type { Chapter, Monster } from "../src/game/types";
import { TRAIT_SET } from "../src/game/traits";

export type Severity = "error" | "warn";

export type ValidationIssue = {
  monsterId?: string;
  layerIdx?: number;
  severity: Severity;
  code:
    | "no-layers"
    | "no-vitals"
    | "layer-too-large"
    | "trivial-heart"
    | "trivial-killer"
    | "monster-no-traits"
    | "layer-no-traits"
    | "layer-trait-not-in-monster"
    | "unknown-trait"
    | "missing-pool"
    | "tutorial-missing-coaching"
    | "coaching-on-non-tutorial";
  message: string;
};

const TRIVIAL_PATTERNS = [".*", ".+", "\\w+", "\\S+"];

export function validateChapter(chapter: Chapter): ValidationIssue[] {
  return chapter.monsters.flatMap((m) => validateMonster(m));
}

export function validateMonster(m: Monster): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // v2: pool
  if (!m.pool) {
    issues.push({ monsterId: m.id, severity: "error", code: "missing-pool", message: "monster missing pool" });
  }

  // v2: traits on monster
  if (!Array.isArray(m.traits) || m.traits.length === 0) {
    issues.push({ monsterId: m.id, severity: "error", code: "monster-no-traits", message: "monster has no traits" });
  } else {
    for (const t of m.traits) {
      if (!TRAIT_SET.has(t)) {
        issues.push({ monsterId: m.id, severity: "error", code: "unknown-trait", message: `unknown trait "${t}"` });
      }
    }
  }

  // v2: coaching field rules
  if (m.pool === "tutorial" && (m.coaching === undefined || m.coaching.trim() === "")) {
    issues.push({ monsterId: m.id, severity: "warn", code: "tutorial-missing-coaching", message: "tutorial monster has no coaching text" });
  }
  if (m.pool !== "tutorial" && m.coaching !== undefined) {
    issues.push({ monsterId: m.id, severity: "error", code: "coaching-on-non-tutorial", message: "non-tutorial monster should not set coaching" });
  }

  // v1 checks (preserved)
  if (m.layers.length === 0) {
    issues.push({ monsterId: m.id, severity: "error", code: "no-layers", message: "monster has no layers" });
    return issues;
  }
  if (m.heart.text.length < 3 || /^(.)\1+$/.test(m.heart.text)) {
    issues.push({ monsterId: m.id, severity: "error", code: "trivial-heart", message: `heart "${m.heart.text}" too trivial` });
  }
  m.layers.forEach((layer, idx) => {
    if (layer.lines.length > 8) {
      issues.push({ monsterId: m.id, layerIdx: idx, severity: "error", code: "layer-too-large", message: `${layer.lines.length} lines > 8` });
    }
    const vitalCount = layer.lines.filter((l) => l.vital).length;
    if (vitalCount === 0) {
      issues.push({ monsterId: m.id, layerIdx: idx, severity: "error", code: "no-vitals", message: "no vital lines in layer" });
    }

    // v2: layer traits (non-empty + subset)
    if (!Array.isArray(layer.traits) || layer.traits.length === 0) {
      issues.push({ monsterId: m.id, layerIdx: idx, severity: "error", code: "layer-no-traits", message: "layer has no traits" });
    } else {
      const monsterTraitSet = new Set(m.traits);
      for (const t of layer.traits) {
        if (!TRAIT_SET.has(t)) {
          issues.push({ monsterId: m.id, layerIdx: idx, severity: "error", code: "unknown-trait", message: `unknown trait "${t}"` });
        } else if (!monsterTraitSet.has(t)) {
          issues.push({ monsterId: m.id, layerIdx: idx, severity: "error", code: "layer-trait-not-in-monster", message: `layer trait "${t}" not declared on monster` });
        }
      }
    }

    // v1: trivial-killer (skipped for tutorial pool)
    if (m.pool !== "tutorial" && vitalCount > 0) {
      const trivialBeats = TRIVIAL_PATTERNS.some((p) => {
        const re = new RegExp(p, "u");
        let hits = 0;
        let collateral = 0;
        for (const line of layer.lines) {
          if (re.test(line.text)) {
            line.vital ? hits++ : collateral++;
          }
        }
        return hits === vitalCount && collateral === 0;
      });
      if (trivialBeats) {
        issues.push({
          monsterId: m.id, layerIdx: idx, severity: "error", code: "trivial-killer",
          message: `a trivial regex (one of ${TRIVIAL_PATTERNS.join(", ")}) clean-strips this layer`,
        });
      }
    }
  });

  return issues;
}

async function main(): Promise<void> {
  const mod = await import("../src/content");
  const allMonsters: Monster[] = mod.allMonsters;
  const all = allMonsters.flatMap((m) => validateMonster(m).map((i) => ({ pool: m.pool, ...i })));
  const errors = all.filter((i) => i.severity === "error");
  const warnings = all.filter((i) => i.severity === "warn");
  if (errors.length === 0) {
    console.log(`✓ ${allMonsters.length} monster(s) validated, ${warnings.length} warning(s).`);
    for (const w of warnings) console.warn(`! [${w.pool}/${w.monsterId ?? "?"}/L${w.layerIdx ?? "?"}] ${w.code}: ${w.message}`);
    return;
  }
  for (const i of all) {
    const tag = i.severity === "error" ? "✗" : "!";
    console.error(`${tag} [${i.pool}/${i.monsterId ?? "?"}/L${i.layerIdx ?? "?"}] ${i.code}: ${i.message}`);
  }
  process.exit(1);
}

if (import.meta.main) {
  main();
}
