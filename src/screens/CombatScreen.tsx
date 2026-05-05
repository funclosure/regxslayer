import React, { useState, useEffect } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { BodyView } from "@/components/BodyView";
import { ControlsHint } from "@/components/ControlsHint";
import { FeedbackLine } from "@/components/FeedbackLine";
import { HintOverlay } from "@/components/HintOverlay";
import { HpBar } from "@/components/HpBar";
import { LayerRoadmap } from "@/components/LayerRoadmap";
import { MonsterPortrait } from "@/components/MonsterPortrait";
import { RegexInput } from "@/components/RegexInput";
import { useCombatEngine, type TraitEvent } from "@/components/hooks/useCombatEngine";
import type { Chapter, Monster, BestRegex, SaveMode } from "@/game/types";

export type CombatScreenProps = {
  chapter: Chapter;
  monster: Monster;
  mode: SaveMode;
  onKill: (bestRegexes: Record<string, BestRegex>) => void;
  onFlee: () => void;
  onTraitEvent?: (e: TraitEvent) => void;
};

const SLAIN_COLOR = "#ff6b6b";
const STRIPPED_COLOR = "#4dffaa";
const ATTR_BOLD = 1 << 0;
const SHIMMER_SPOT_WIDTH = 6;          // chars on each side of the spotlight center
const SHIMMER_BASE_COLOR = "#3a3a3a";  // color when no spotlight is on a char

/** Drives a shimmer "spotlight" position from off-screen-left to off-screen-right
 *  over `totalMs`, plus an ease-out fade in the final 250ms. Returns:
 *    - `pos`: the spotlight character index (can be negative, can exceed length)
 *    - `opacity`: 0..1 envelope (ramps down at the end so the banner fades into
 *      whatever comes next instead of cutting). */
function useShimmer(totalMs: number, textLength: number): { pos: number; opacity: number } {
  const fadeOutMs = 250;
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let cancelled = false;
    let handle: ReturnType<typeof setTimeout> | null = null;
    const tick = (): void => {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      setT(elapsed);
      if (elapsed < totalMs) handle = setTimeout(tick, 33);
    };
    tick();
    return () => {
      cancelled = true;
      if (handle !== null) clearTimeout(handle);
    };
  }, [totalMs]);

  // Spotlight runs across the text + outside margins so the shine enters and exits cleanly.
  const sweepStart = -SHIMMER_SPOT_WIDTH;
  const sweepEnd = textLength + SHIMMER_SPOT_WIDTH;
  const progress = Math.min(1, t / Math.max(1, totalMs - fadeOutMs));
  const pos = sweepStart + (sweepEnd - sweepStart) * progress;
  const opacity = t > totalMs - fadeOutMs ? Math.max(0, (totalMs - t) / fadeOutMs) : 1;
  return { pos, opacity };
}

/** Linearly interpolate two #rrggbb colors. `mix` in 0..1 (0 → a, 1 → b). */
function blendHex(a: string, b: string, mix: number): string {
  const m = Math.max(0, Math.min(1, mix));
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * m);
  const g = Math.round(ag + (bg - ag) * m);
  const bl = Math.round(ab + (bb - ab) * m);
  const hh = (n: number): string => n.toString(16).padStart(2, "0");
  return `#${hh(r)}${hh(g)}${hh(bl)}`;
}

/** Render `text` as a row of per-character spans, each colored by its distance
 *  from the spotlight. The spotlight at `pos` is the brightest; chars farther
 *  away fall off linearly toward `SHIMMER_BASE_COLOR`. */
function shimmerSpans(text: string, pos: number, peakColor: string): React.ReactElement[] {
  return Array.from(text).map((ch, i) => {
    const d = Math.abs(i - pos);
    const intensity = Math.max(0, 1 - d / SHIMMER_SPOT_WIDTH);
    const fg = blendHex(SHIMMER_BASE_COLOR, peakColor, intensity);
    return React.createElement(
      "span",
      { key: i, style: { fg, attributes: ATTR_BOLD } },
      ch,
    );
  });
}

function SlainBanner({ pattern }: { pattern: string }): React.ReactElement {
  // Matches the kill-phase timeout in the parent useEffect (2000ms).
  const text = "✦ ✦ ✦  SLAIN  ✦ ✦ ✦";
  const { pos, opacity } = useShimmer(2000, text.length);
  return (
    <box flexDirection="column" gap={1} padding={1} opacity={opacity}>
      <text>{shimmerSpans(text, pos, SLAIN_COLOR)}</text>
      <text>killed by:  {pattern}</text>
    </box>
  );
}

function LayerStrippedBanner({ topic, pattern }: { topic: string; pattern: string }): React.ReactElement {
  // Matches stripDelayMs default in useCombatEngine (1500ms).
  const text = `✓  LAYER STRIPPED — ${topic}`;
  const { pos, opacity } = useShimmer(1500, text.length);
  return (
    <box flexDirection="column" gap={1} padding={1} opacity={opacity}>
      <text>{shimmerSpans(text, pos, STRIPPED_COLOR)}</text>
      <text>matched by:  {pattern}</text>
    </box>
  );
}

export function CombatScreen(props: CombatScreenProps): React.ReactElement {
  const { chapter, monster, mode, onKill, onFlee, onTraitEvent } = props;
  const engine = useCombatEngine({ monster, onTraitEvent });
  const [hintOpen, setHintOpen] = useState(false);

  // Hold the kill scene for ~2s before transitioning — the SLAIN moment
  // should feel weightier than a per-layer strip (which is 1.5s).
  useEffect(() => {
    if (engine.state.phase.kind !== "kill") return;
    const timer = setTimeout(() => onKill(engine.state.bestRegexes), 2000);
    return () => clearTimeout(timer);
  }, [engine.state.phase, engine.state.bestRegexes, onKill]);

  useKeyboard((e: KeyEvent) => {
    if (engine.state.phase.kind === "intro" && e.name === "return") {
      engine.dismissIntro();
      return;
    }
    // Tab toggles the cheatsheet. We avoid "?" because it's QUANT_OPTIONAL
    // and the player must type it into the input. Tab never appears in a
    // regex pattern (it'd be written as "\t").
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
  // HP is monster health — full at start, drains as the player progresses.
  // Progress percent: how much of the monster you've cleared (layers + heart).
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

  if (engine.state.phase.kind === "intro") {
    return (
      <box flexDirection="column" padding={2} gap={1} alignItems="center">
        <MonsterPortrait name={monster.portrait} />
        <text>{monster.name}</text>
        <text>{monster.flavor}</text>
        {isTutorial && monster.coaching ? <text>{monster.coaching}</text> : null}
        <text>[⏎] begin</text>
      </box>
    );
  }

  return (
    <box flexDirection="row" flexGrow={1}>
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
      <box flexDirection="column" flexGrow={1} padding={1} gap={1}>
        {layerCoaching ? <text>→ {layerCoaching}</text> : null}
        <BodyView
          monster={monster}
          activeLayerIdx={activeIdx}
          strippedIdxs={engine.state.layersStripped}
          inHeart={inHeart}
          matchedKeys={engine.evalResult?.matchedLineKeys ?? new Set<string>()}
          matchedRanges={engine.evalResult?.matchedRanges}
        />
        {engine.state.phase.kind === "kill" ? (
          <SlainBanner pattern={engine.state.bestRegexes["heart"]?.pattern ?? engine.pattern} />
        ) : engine.state.phase.kind === "strip" ? (
          <LayerStrippedBanner
            topic={monster.layers[engine.state.phase.layerIdx]?.topic ?? ""}
            pattern={engine.state.bestRegexes[String(engine.state.phase.layerIdx)]?.pattern ?? engine.pattern}
          />
        ) : hintOpen ? (
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
