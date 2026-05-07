import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { ChoiceList, navigateChoiceList, type ChoiceItem } from "@/components/shell/panel/ChoiceList";
import type { Chapter, SaveFile } from "@/game/types";

export type StorySelectProps = {
  chapters: Chapter[];
  save: SaveFile;
  onPickMonster: (chapterId: string, monsterId: string) => void;
  onBack: () => void;
};

export function isSlain(save: SaveFile, chapterId: string, monsterId: string): boolean {
  return Boolean(save.chapters[chapterId]?.monsters[monsterId]?.slainAt);
}

export function hasAnySlain(save: SaveFile, chapterId: string): boolean {
  const ms = save.chapters[chapterId]?.monsters ?? {};
  return Object.values(ms).some((m) => Boolean(m.slainAt));
}

export function isChapterUnlocked(save: SaveFile, chapters: Chapter[], ci: number): boolean {
  if (ci <= 0) return true;
  const prev = chapters[ci - 1];
  return prev ? hasAnySlain(save, prev.id) : false;
}

/** Pure builder for the choice items, exported for testing.
 *  Composite key on choices is `${chapterId}:${monsterId}` so the action handler
 *  can split it back into a chapter+monster pair. */
export function buildStoryChoiceItems(chapters: Chapter[], save: SaveFile): ChoiceItem[] {
  const items: ChoiceItem[] = [];
  chapters.forEach((c, ci) => {
    const unlocked = isChapterUnlocked(save, chapters, ci);
    const total = c.monsters.length;
    const slain = c.monsters.filter((m) => isSlain(save, c.id, m.id)).length;
    const head = unlocked ? `${c.title} — ${slain}/${total} slain` : `${c.title} (locked)`;
    items.push({ kind: "section", label: head });
    if (unlocked) {
      for (const m of c.monsters) {
        const mark = isSlain(save, c.id, m.id) ? "✓" : "·";
        items.push({ kind: "choice", key: `${c.id}:${m.id}`, label: `${mark} ${m.name}` });
      }
    }
  });
  return items;
}

export function StorySelectScreen({ chapters, save, onPickMonster, onBack }: StorySelectProps): React.ReactElement {
  const items = buildStoryChoiceItems(chapters, save);
  // Initial focus = first choice item (skip leading section).
  const firstChoiceIdx = items.findIndex((it) => it.kind === "choice");
  const [idx, setIdx] = useState(firstChoiceIdx === -1 ? 0 : firstChoiceIdx);

  useKeyboard((e: KeyEvent) => {
    if (items.length === 0) {
      if (e.name === "escape") onBack();
      return;
    }
    if (e.name === "up" || e.name === "down") {
      setIdx((i) => navigateChoiceList(items, i, e.name as "up" | "down"));
    } else if (e.name === "return") {
      const item = items[idx];
      if (item?.kind === "choice") {
        const [chapterId, monsterId] = item.key.split(":");
        if (chapterId && monsterId) onPickMonster(chapterId, monsterId);
      }
    } else if (e.name === "escape") onBack();
  }, { global: true });

  // Scene is intentionally sparse for v1 — status row already carries lifetime stats.
  const scene = <SceneFrame><text> </text></SceneFrame>;

  return (
    <Shell
      screen="story"
      scene={scene}
      panel={
        <ChoiceList
          items={items}
          focusedIdx={idx}
          header="Choose your fight"
          hints="[↑↓] move · [⏎] enter · [esc] back"
        />
      }
    />
  );
}
