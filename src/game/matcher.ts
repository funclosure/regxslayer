import type { CombatPhase, EvalResult, MatchRange, Monster } from "./types";

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
  matchedRanges: new Map(),
};

export function evaluate(input: EvaluateInput): EvalResult {
  const { pattern, monster, phase, budgetMs = 50 } = input;

  if (pattern === "") {
    return withTotals(EMPTY, monster, phase);
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, "gu");
  } catch (err) {
    return { ...withTotals(EMPTY, monster, phase), invalid: (err as Error).message };
  }

  const matched = new Set<string>();
  const ranges = new Map<string, ReadonlyArray<MatchRange>>();
  const start = performance.now();

  const isLayerPhase = phase.kind === "layerActive";
  const isHeartPhase = phase.kind === "heart";

  // Iterate every layer + heart, marking matches + ranges, aborting if budget exceeded.
  for (let li = 0; li < monster.layers.length; li++) {
    const layer = monster.layers[li]!;
    for (let i = 0; i < layer.lines.length; i++) {
      const line = layer.lines[i]!;
      if (performance.now() - start > budgetMs) {
        return { ...withTotals(EMPTY, monster, phase), invalid: "slow" };
      }
      const lineRanges = findRanges(regex, line.text);
      if (lineRanges !== null) {
        const key = `${li}:${i}`;
        matched.add(key);
        ranges.set(key, lineRanges);
      }
    }
  }
  const heartRanges = findRanges(regex, monster.heart.text);
  if (heartRanges !== null) {
    matched.add("heart");
    ranges.set("heart", heartRanges);
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
    // Locked layers (any idx > activeIdx): every match is collateral.
    for (let li = activeIdx + 1; li < monster.layers.length; li++) {
      const layer = monster.layers[li]!;
      for (let i = 0; i < layer.lines.length; i++) {
        if (matched.has(`${li}:${i}`)) collateral++;
      }
    }
    if (matched.has("heart")) collateral++;
  } else if (isHeartPhase) {
    vitalsTotal = 1;
    if (matched.has("heart")) vitalsHit = 1;
    for (const key of matched) {
      if (key !== "heart") collateral++;
    }
  }

  const perfect = vitalsTotal > 0 && vitalsHit === vitalsTotal && collateral === 0;
  return { vitalsHit, vitalsTotal, collateral, perfect, matchedLineKeys: matched, matchedRanges: ranges };
}

/**
 * Run a global regex against `text` and return the array of match ranges, or
 * `null` if the regex doesn't match at all.
 *
 * - Returns an empty array when the regex matches but every match is
 *   zero-length (e.g. `^`, `$`, `(?=foo)`). Zero-length matches still count
 *   as a match for purposes of trait counting, but BodyView won't underline
 *   anything for them.
 * - Resets `lastIndex` so calls are independent.
 */
function findRanges(re: RegExp, text: string): ReadonlyArray<MatchRange> | null {
  re.lastIndex = 0;
  const out: MatchRange[] = [];
  let any = false;
  // Use exec in a loop so we control advancement explicitly. matchAll would
  // also work but exec gives a simpler hand-rolled loop with the existing
  // `g`-flag semantics.
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    any = true;
    const startIdx = m.index;
    const endIdx = startIdx + m[0].length;
    if (m[0].length > 0) {
      out.push([startIdx, endIdx] as const);
    }
    // Avoid infinite loop on zero-length matches.
    if (m[0].length === 0) {
      re.lastIndex = m.index + 1;
    }
  }
  return any ? out : null;
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
