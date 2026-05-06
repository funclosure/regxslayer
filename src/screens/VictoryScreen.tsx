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
    <Screen hints="[⏎] continue">
      <box flexDirection="column" gap={0}>
        <text>VICTORY</text>
        <text>───────────────</text>
      </box>
      <text>{monsterName} has fallen.</text>
      <box flexGrow={1} />
    </Screen>
  );
}
