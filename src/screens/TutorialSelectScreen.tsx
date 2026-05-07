import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { ChoiceList, navigateChoiceList, type ChoiceItem } from "@/components/shell/panel/ChoiceList";
import type { Monster } from "@/game/types";

export type TutorialSelectProps = {
  monsters: Monster[];
  onPick: (monsterId: string) => void;
  onBack: () => void;
};

export function TutorialSelectScreen({ monsters, onPick, onBack }: TutorialSelectProps): React.ReactElement {
  const items: ChoiceItem[] = monsters.map((m) => ({ kind: "choice", key: m.id, label: m.name }));
  const [idx, setIdx] = useState(0);

  useKeyboard((e: KeyEvent) => {
    if (items.length === 0) {
      if (e.name === "escape") onBack();
      return;
    }
    if (e.name === "up" || e.name === "down") {
      setIdx((i) => navigateChoiceList(items, i, e.name as "up" | "down"));
    } else if (e.name === "return") {
      const item = items[idx];
      if (item?.kind === "choice") onPick(item.key);
    } else if (e.name === "escape") onBack();
  }, { global: true });

  const scene = (
    <SceneFrame>
      <text>(tutorials are replayable; they don't track progress or feed stats)</text>
    </SceneFrame>
  );

  return (
    <Shell
      screen="tutorial"
      scene={scene}
      panel={
        <ChoiceList
          items={items}
          focusedIdx={idx}
          header="Pick a teacher"
          hints="[↑↓] move · [⏎] start · [esc] back"
        />
      }
    />
  );
}
