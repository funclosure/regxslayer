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
  // @ts-expect-error chapters.ts is created in a later task
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
