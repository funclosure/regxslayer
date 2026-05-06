import React from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Screen } from "@/components/Screen";

export type EncounterIntroProps = {
  onBegin: () => void;
  onBack: () => void;
};

export function EncounterIntroScreen({ onBegin, onBack }: EncounterIntroProps): React.ReactElement {
  useKeyboard((e: KeyEvent) => {
    if (e.name === "return") onBegin();
    else if (e.name === "escape") onBack();
  }, { global: true });

  return (
    <Screen>
      <box flexDirection="column" gap={1}>
        <text>WILD ENCOUNTER MODE</text>
        <text>───────────────────</text>
        <text>Random monsters from the wild + story pools.</text>
        <text>Slay one and the next appears immediately.</text>
        <text>[esc] flees back to main menu.</text>
        <text> </text>
        <text>[⏎] begin     [esc] back</text>
      </box>
    </Screen>
  );
}
