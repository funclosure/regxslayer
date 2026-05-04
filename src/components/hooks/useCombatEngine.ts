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

  useEffect(() => {
    if (!evalResult || !evalResult.perfect) return;
    setState((s) => advance(s, { kind: "perfectMatch", pattern }));
  }, [evalResult, pattern]);

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
