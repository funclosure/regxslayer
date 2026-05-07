import React from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { Prompt } from "@/components/shell/panel/Prompt";

export type EncounterIntroProps = {
  onBegin: () => void;
  onBack: () => void;
};

export function EncounterIntroScreen({ onBegin, onBack }: EncounterIntroProps): React.ReactElement {
  useKeyboard((e: KeyEvent) => {
    if (e.name === "return") onBegin();
    else if (e.name === "escape") onBack();
  }, { global: true });

  const scene = (
    <SceneFrame>
      <box flexDirection="column" gap={0}>
        <text>WILD ENCOUNTER MODE</text>
        <text>───────────────────</text>
      </box>
      <text> </text>
      <text>Random monsters from the wild + story pools.</text>
      <text>Slay one and the next appears immediately.</text>
      <text>[esc] flees back to main menu.</text>
    </SceneFrame>
  );

  return (
    <Shell
      screen="encounter"
      scene={scene}
      panel={<Prompt hint="[⏎] begin · [esc] back" />}
    />
  );
}
