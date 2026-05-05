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

export function CombatScreen(props: CombatScreenProps): React.ReactElement {
  const { chapter, monster, mode, onKill, onFlee, onTraitEvent } = props;
  const engine = useCombatEngine({ monster, onTraitEvent });
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (engine.state.phase.kind === "kill") {
      onKill(engine.state.bestRegexes);
    }
  }, [engine.state.phase, engine.state.bestRegexes, onKill]);

  useKeyboard((e: KeyEvent) => {
    if (engine.state.phase.kind === "intro" && e.name === "return") {
      engine.dismissIntro();
      return;
    }
    if (e.name === "?") {
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
  const hpPercent = ((engine.state.layersStripped.length + heartProgress) / (totalLayers + 1)) * 100;

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
        {hintOpen ? (
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
