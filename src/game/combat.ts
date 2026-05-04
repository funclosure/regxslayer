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
      if (state.phase.kind === "strip") {
        const key = String(state.phase.layerIdx);
        return {
          ...state,
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
