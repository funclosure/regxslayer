import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { advance, initialState, type CombatState } from "@/game/combat";
import { computeDamage } from "@/game/damage";
import { evaluate } from "@/game/matcher";
import type { Trait } from "@/game/traits";
import type { EvalResult, Monster } from "@/game/types";

/**
 * How long a per-layer STRIPPED banner runs, AND how long the heart-kill
 * SLAIN banner runs. Single source of truth — `CombatScreen`'s kill-phase
 * timeout, the strip-phase timer, and `ShimmerBanner` durations all derive
 * from this. Tweak this one number to retime both banners together.
 */
export const BANNER_DURATION_MS = 2500;

export type TraitEvent =
  | { kind: "perfect-strip"; layerIdx: number; traits: Trait[] }
  | { kind: "non-perfect-try"; layerIdx: number; traits: Trait[] };

export type CombatEngine = {
  state: CombatState;
  pattern: string;
  evalResult: EvalResult | null;
  damage: number;
  setPattern: (p: string) => void;
  dismissIntro: () => void;
  dismissKill: () => void;
};

export type UseCombatEngineOpts = {
  monster: Monster;
  stripDelayMs?: number;
  onTraitEvent?: (e: TraitEvent) => void;
};

export function useCombatEngine(opts: UseCombatEngineOpts): CombatEngine {
  const stripDelayMs = opts.stripDelayMs ?? BANNER_DURATION_MS;

  const [state, setState] = useState<CombatState>(() => initialState(opts.monster));
  const [pattern, setPattern] = useState("");

  // Per-layer-life dedup state for non-perfect-try events.
  // Reset whenever the active layer changes (or we leave layerActive).
  const seenNonPerfectKey = useRef<Set<string>>(new Set());
  const seenNonPerfectTraits = useRef<Set<Trait>>(new Set());
  const lastLayerKey = useRef<string>("");

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

  // Reset per-layer-life dedup when the active layer changes.
  useEffect(() => {
    const key =
      state.phase.kind === "layerActive" ? `L${state.phase.layerIdx}` :
      state.phase.kind === "heart"        ? `H` :
      "";
    if (key !== lastLayerKey.current) {
      lastLayerKey.current = key;
      seenNonPerfectKey.current = new Set();
      seenNonPerfectTraits.current = new Set();
    }
  }, [state.phase]);

  // Fire trait events: perfect-strip on perfect; non-perfect-try on novel imperfect patterns.
  useEffect(() => {
    if (!evalResult) return;
    const onTraitEvent = opts.onTraitEvent;
    if (!onTraitEvent) return;

    if (state.phase.kind === "layerActive") {
      const layer = opts.monster.layers[state.phase.layerIdx];
      if (!layer) return;

      if (evalResult.perfect) {
        // Perfect-strip event for this layer's traits.
        onTraitEvent({ kind: "perfect-strip", layerIdx: state.phase.layerIdx, traits: layer.traits });
        return;
      }
      // Non-perfect: dedup by (pattern, trait) within the current layer-life.
      if (pattern === "" || evalResult.invalid) return;
      if (seenNonPerfectKey.current.has(pattern)) return;
      seenNonPerfectKey.current.add(pattern);
      const novelTraits = layer.traits.filter((t) => !seenNonPerfectTraits.current.has(t));
      if (novelTraits.length === 0) return;
      for (const t of novelTraits) seenNonPerfectTraits.current.add(t);
      onTraitEvent({ kind: "non-perfect-try", layerIdx: state.phase.layerIdx, traits: novelTraits });
    }
    // Heart phase: no per-trait events for v2 (heart uses the monster's union — recorded via recordKill instead).
  }, [evalResult, pattern, state.phase, opts.monster, opts.onTraitEvent]);

  // Advance state on perfect (layer or heart).
  useEffect(() => {
    if (!evalResult || !evalResult.perfect) return;
    setState((s) => advance(s, { kind: "perfectMatch", pattern }));
  }, [evalResult, pattern]);

  // Strip animation timer.
  useEffect(() => {
    if (state.phase.kind !== "strip") return;
    const handle = setTimeout(() => {
      setState((s) => advance(s, { kind: "stripDone" }));
      setPattern("");
    }, stripDelayMs);
    return () => clearTimeout(handle);
  }, [state.phase, stripDelayMs]);

  const dismissIntro = useCallback(() => setState((s) => advance(s, { kind: "dismissIntro" })), []);
  const dismissKill = useCallback(() => setState((s) => advance(s, { kind: "dismissKill" })), []);

  return { state, pattern, evalResult, damage, setPattern, dismissIntro, dismissKill };
}
