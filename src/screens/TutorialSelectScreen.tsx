import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import type { Monster } from "@/game/types";
import { Screen } from "@/components/Screen";

export type TutorialSelectProps = {
  monsters: Monster[];
  onPick: (monsterId: string) => void;
  onBack: () => void;
};

export function TutorialSelectScreen({ monsters, onPick, onBack }: TutorialSelectProps): React.ReactElement {
  const [idx, setIdx] = useState(0);

  useKeyboard((e: KeyEvent) => {
    if (monsters.length === 0) {
      if (e.name === "escape") onBack();
      return;
    }
    if (e.name === "up") setIdx((i) => (i + monsters.length - 1) % monsters.length);
    else if (e.name === "down") setIdx((i) => (i + 1) % monsters.length);
    else if (e.name === "return") onPick(monsters[idx]!.id);
    else if (e.name === "escape") onBack();
  }, { global: true });

  return (
    <Screen>
      <text>Tutorial — pick a teacher  ([esc] back)</text>
      <text>──────────────────────────────────────</text>
      {monsters.map((m, i) => (
        <text key={m.id}>{i === idx ? "▶ " : "  "}{m.name}</text>
      ))}
      <text> </text>
      <text>(tutorials are replayable; they don't track progress or feed stats)</text>
    </Screen>
  );
}
