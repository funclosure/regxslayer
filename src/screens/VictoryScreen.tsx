import React from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Screen } from "@/components/Screen";

export type VictoryScreenProps = {
  monsterName: string;
  onContinue: () => void;
};

export function VictoryScreen({ monsterName, onContinue }: VictoryScreenProps): React.ReactElement {
  useKeyboard((e: KeyEvent) => {
    if (e.name === "return") onContinue();
  }, { global: true });

  return (
    <Screen centerVertically>
      <box flexDirection="column" gap={1} alignItems="center">
        <text>VICTORY</text>
        <text>{monsterName} has fallen.</text>
        <text>───────────────</text>
        <text>press ⏎ to continue</text>
      </box>
    </Screen>
  );
}
