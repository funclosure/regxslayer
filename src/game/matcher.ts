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
