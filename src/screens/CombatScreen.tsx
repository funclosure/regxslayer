import React, { useState, useEffect } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { BodyView } from "@/components/BodyView";
import { HpBar } from "@/components/HpBar";
import { LayerRoadmap } from "@/components/LayerRoadmap";
import { MonsterPortrait } from "@/components/MonsterPortrait";
import { POSITIVE_COLOR, DANGER_COLOR } from "@/components/style";
import { Shell } from "@/components/shell/Shell";
import { Prompt } from "@/components/shell/panel/Prompt";
import { TextInput } from "@/components/shell/panel/TextInput";
import { BannerSlot } from "@/components/shell/panel/BannerSlot";
import { Cheatsheet } from "@/components/shell/panel/Cheatsheet";
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

function CombatSideRail(props: {
  chapterTitle: string;
  monster: Monster;
  hpPercent: number;
  activeIdx: number;
  strippedIdxs: number[];
  inHeart: boolean;
}): React.ReactElement {
  return (
    <box flexDirection="column" padding={1} width={28} gap={1}>
      <text>{props.chapterTitle}</text>
      <MonsterPortrait name={props.monster.portrait} />
      <text>{props.monster.name}</text>
      <HpBar percent={props.hpPercent} max={100} />
      <LayerRoadmap
        topics={props.monster.layers.map((l) => l.topic)}
        activeIdx={props.activeIdx}
        strippedIdxs={props.strippedIdxs}
        inHeart={props.inHeart}
      />
    </box>
  );
}

export function CombatScreen(props: CombatScreenProps): React.ReactElement {
  const { chapter, monster, mode, onKill, onFlee, onTraitEvent } = props;
  const engine = useCombatEngine({ monster, onTraitEvent });
  const [hintOpen, setHintOpen] = useState(false);

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

  // Intro phase: simple centered scene + Prompt panel.
  if (engine.state.phase.kind === "intro") {
    const introScene = (
      <box flexDirection="column" flexGrow={1} padding={2} gap={1} alignItems="center">
        <MonsterPortrait name={monster.portrait} />
        <text>{monster.name}</text>
        <text>{monster.flavor}</text>
        {isTutorial && monster.coaching ? <text>{monster.coaching}</text> : null}
      </box>
    );
    return (
      <Shell
        screen="combat"
        capWidth={false}
        scene={introScene}
        panel={<Prompt hint="[⏎] begin · [esc] flee" />}
      />
    );
  }

  // Active phase scene: side rail + body view, no input chrome (that's in the panel).
  const scene = (
    <box flexDirection="row" flexGrow={1}>
      <CombatSideRail
        chapterTitle={chapter.title}
        monster={monster}
        hpPercent={hpPercent}
        activeIdx={activeIdx}
        strippedIdxs={engine.state.layersStripped}
        inHeart={inHeart}
      />
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
      </box>
    </box>
  );

  // Pick the panel mode based on phase + hint toggle.
  let panel: React.ReactElement<{ capWidth?: boolean }>;
  if (engine.state.phase.kind === "kill") {
    panel = (
      <BannerSlot
        headline="✦ ✦ ✦  SLAIN  ✦ ✦ ✦"
        peakColor={DANGER_COLOR}
        durationMs={BANNER_DURATION_MS}
        footnoteLabel="killed by:"
        footnoteValue={engine.state.bestRegexes["heart"]?.pattern ?? engine.pattern}
      />
    );
  } else if (engine.state.phase.kind === "strip") {
    panel = (
      <BannerSlot
        headline={`✓  LAYER STRIPPED — ${monster.layers[engine.state.phase.layerIdx]?.topic ?? ""}`}
        peakColor={POSITIVE_COLOR}
        durationMs={BANNER_DURATION_MS}
        footnoteLabel="matched by:"
        footnoteValue={engine.state.bestRegexes[String(engine.state.phase.layerIdx)]?.pattern ?? engine.pattern}
      />
    );
  } else if (hintOpen) {
    panel = (
      <Cheatsheet
        chapterTitle={chapter.title}
        lines={chapter.cheatsheet}
        hints="[tab] back to combat"
      />
    );
  } else {
    panel = (
      <TextInput
        pattern={engine.pattern}
        onPatternChange={(p) => engine.setPattern(p)}
        vitalsHit={engine.evalResult?.vitalsHit ?? 0}
        vitalsTotal={engine.evalResult?.vitalsTotal ?? 0}
        collateral={engine.evalResult?.collateral ?? 0}
        damage={engine.damage}
        invalid={engine.evalResult?.invalid}
        hints="[tab] hint · [esc] flee"
        sparksActive={engine.state.phase.kind === "heart"}
        sparksTrigger={engine.pattern.length}
      />
    );
  }

  return <Shell screen="combat" capWidth={false} scene={scene} panel={panel} />;
}
