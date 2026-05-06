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
import { ShimmerBanner } from "@/components/ShimmerBanner";
import { HeartSparks } from "@/components/HeartSparks";
import { POSITIVE_COLOR, DANGER_COLOR } from "@/components/style";
import {
  useCombatEngine,
  BANNER_DURATION_MS,
  type TraitEvent,
} from "@/components/hooks/useCombatEngine";
import type { Chapter, Monster, BestRegex, SaveMode } from "@/game/types";

export type CombatScreenProps = {
  chapter: Chapter;
  monster: Monster;
  mode: SaveMode;
  onKill: (bestRegexes: Record<string, BestRegex>) => void;
  onFlee: () => void;
  onTraitEvent?: (e: TraitEvent) => void;
};

export function CombatScreen(props: CombatScreenProps): React.ReactElement {
  const { chapter, monster, mode, onKill, onFlee, onTraitEvent } = props;
  const engine = useCombatEngine({ monster, onTraitEvent });
  const [hintOpen, setHintOpen] = useState(false);

  // Hold the kill scene for one banner-duration before transitioning to victory.
  // The same constant powers the strip-phase timer in useCombatEngine, so the
  // STRIPPED and SLAIN banners pace identically.
  useEffect(() => {
    if (engine.state.phase.kind !== "kill") return;
    const timer = setTimeout(() => onKill(engine.state.bestRegexes), BANNER_DURATION_MS);
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
          heartKilled={engine.state.phase.kind === "kill"}
        />
        {engine.state.phase.kind === "kill" ? (
          <ShimmerBanner
            headline="✦ ✦ ✦  SLAIN  ✦ ✦ ✦"
            peakColor={DANGER_COLOR}
            durationMs={BANNER_DURATION_MS}
            footnoteLabel="killed by:"
            footnoteValue={engine.state.bestRegexes["heart"]?.pattern ?? engine.pattern}
          />
        ) : engine.state.phase.kind === "strip" ? (
          <ShimmerBanner
            headline={`✓  LAYER STRIPPED — ${monster.layers[engine.state.phase.layerIdx]?.topic ?? ""}`}
            peakColor={POSITIVE_COLOR}
            durationMs={BANNER_DURATION_MS}
            footnoteLabel="matched by:"
            footnoteValue={engine.state.bestRegexes[String(engine.state.phase.layerIdx)]?.pattern ?? engine.pattern}
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
            <HeartSparks
              trigger={engine.pattern.length}
              active={engine.state.phase.kind === "heart"}
            />
          </>
        )}
      </box>
    </box>
  );
}
