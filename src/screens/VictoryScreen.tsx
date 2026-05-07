import React from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { Prompt } from "@/components/shell/panel/Prompt";

export type VictoryScreenProps = {
  monsterName: string;
  onContinue: () => void;
};

export function VictoryScreen({ monsterName, onContinue }: VictoryScreenProps): React.ReactElement {
  useKeyboard((e: KeyEvent) => {
    if (e.name === "return") onContinue();
  }, { global: true });

  const scene = (
    <SceneFrame>
      <box flexDirection="column" gap={0}>
        <text>VICTORY</text>
        <text>───────</text>
      </box>
      <text> </text>
      <text>{monsterName} has fallen.</text>
    </SceneFrame>
  );

  return (
    <Shell
      screen="victory"
      scene={scene}
      panel={<Prompt hint="[⏎] continue" />}
    />
  );
}
