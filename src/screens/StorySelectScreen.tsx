import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import type { Chapter, SaveFile } from "@/game/types";
import { Screen } from "@/components/Screen";

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

type Entry = { chapter: Chapter; monster: Chapter["monsters"][number]; unlocked: boolean };

function flattenEntries(chapters: Chapter[], save: SaveFile): Entry[] {
  return chapters.flatMap((c, ci) => {
    const unlocked = isChapterUnlocked(save, chapters, ci);
    return c.monsters.map((m) => ({ chapter: c, monster: m, unlocked }));
  });
}

export function StorySelectScreen({ chapters, save, onPickMonster, onBack }: StorySelectProps): React.ReactElement {
  const entries = flattenEntries(chapters, save);
  const [idx, setIdx] = useState(0);

  useKeyboard((e: KeyEvent) => {
    if (entries.length === 0) {
      if (e.name === "escape") onBack();
      return;
    }
    if (e.name === "up") setIdx((i) => (i + entries.length - 1) % entries.length);
    else if (e.name === "down") setIdx((i) => (i + 1) % entries.length);
    else if (e.name === "return") {
      const e2 = entries[idx]!;
      if (e2.unlocked) onPickMonster(e2.chapter.id, e2.monster.id);
    } else if (e.name === "escape") onBack();
  }, { global: true });

  return (
    <Screen>
      <text>Choose your fight  ([esc] back)</text>
      <text>──────────────────────────────</text>
      {chapters.map((c, ci) => {
        const unlocked = isChapterUnlocked(save, chapters, ci);
        const total = c.monsters.length;
        const slain = c.monsters.filter((m) => isSlain(save, c.id, m.id)).length;
        const head = unlocked
          ? `${c.title} — ${slain}/${total} slain`
          : `${c.title} (locked)`;
        return (
          <box flexDirection="column" key={c.id}>
            <text>{head}</text>
            {unlocked
              ? c.monsters.map((m) => {
                  const e = entries.findIndex((x) => x.chapter.id === c.id && x.monster.id === m.id);
                  const cur = e === idx;
                  const mark = isSlain(save, c.id, m.id) ? "✓" : "·";
                  return (
                    <text key={m.id}>{cur ? "▶ " : "  "}{mark} {m.name}</text>
                  );
                })
              : null}
          </box>
        );
      })}
    </Screen>
  );
}
