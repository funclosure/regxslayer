import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { ChoiceList, navigateChoiceList, type ChoiceItem } from "@/components/shell/panel/ChoiceList";
import type { SaveFile } from "@/game/types";

export type MenuChoice = "continue" | "story" | "encounter" | "tutorial" | "stats" | "quit";

export type MenuItem = { key: MenuChoice; label: string };

export const CHAPTERS: ReadonlyArray<{ id: string; short: string; total: number }> = [
  { id: "literals-anchors", short: "Literals", total: 4 },
  { id: "char-classes",     short: "Classes",  total: 4 },
  { id: "quantifiers",      short: "Quants",   total: 4 },
];

export function buildContinueLabel(lastMode: SaveFile["lastMode"]): string | null {
  if (lastMode === null) return null;
  return `Continue   (last: ${lastMode})`;
}

export function buildMenuItems(save: SaveFile): MenuItem[] {
  const items: MenuItem[] = [];
  const continueLabel = buildContinueLabel(save.lastMode);
  if (continueLabel !== null) items.push({ key: "continue", label: continueLabel });
  items.push({ key: "story", label: "Story" });
  items.push({ key: "encounter", label: "Encounter" });
  items.push({ key: "tutorial", label: "Tutorial" });
  items.push({ key: "stats", label: "Stats" });
  items.push({ key: "quit", label: "Quit" });
  return items;
}

const CHAPTER_BOX_TOP    = "┌─ chapters ──────────┐";
const CHAPTER_BOX_BOTTOM = "└─────────────────────┘";

export function buildChapterRows(save: SaveFile): string[] {
  const body = CHAPTERS.map((c, i) => {
    const slain = Object.keys(save.chapters[c.id]?.monsters ?? {}).length;
    const filled = Math.min(slain, 4);
    const bar = "█".repeat(filled) + "░".repeat(4 - filled);
    const inner = ` ${i + 1} ${c.short.padEnd(8)} ${bar} ${slain}/${c.total} `;
    return `│${inner}│`;
  });
  return [CHAPTER_BOX_TOP, ...body, CHAPTER_BOX_BOTTOM];
}

const TITLE_ART = [
  " ____  _____ ____ __  __ ____  _      _ __   _______ ____",
  "|  _ \\| ____/ ___|\\ \\/ / ___|| |    / \\\\ \\ / / ____|  _ \\",
  "| |_) |  _|| |  _  \\  /\\___ \\| |   / _ \\\\ V /|  _| | |_) |",
  "|  _ <| |__| |_| | /  \\ ___) | |__/ ___ \\| | | |___|  _ <",
  "|_| \\_\\_____\\____|/_/\\_\\____/|____/_/   \\_\\_| |_____|_| \\_\\",
];

export const MONSTER_ART = [
  "          .----.",
  "      ___/ .  . \\___",
  "     /   \\  --  /   \\",
  "     \\____\\____/____/",
  "          /_||_\\",
];

const TAGLINE = "precision is damage";
const TITLE_WIDTH    = Math.max(...TITLE_ART.map((row) => row.length));
const MONSTER_WIDTH  = Math.max(...MONSTER_ART.map((row) => row.length));
const BAND_GAP       = "    ";

function padRows(rows: string[], width: number): string[] {
  return rows.map((row) => row.padEnd(width, " "));
}

export function buildSplashRows(save: SaveFile): string[] {
  const titleRows   = padRows(TITLE_ART, TITLE_WIDTH);
  const chapterRows = buildChapterRows(save);
  const monsterRows = padRows(MONSTER_ART, MONSTER_WIDTH);
  const bandRows    = monsterRows.map((row, i) => row + BAND_GAP + (chapterRows[i] ?? ""));
  return [...titleRows, ...bandRows, TAGLINE];
}

function MenuSplash({ save }: { save: SaveFile }): React.ReactElement {
  const rows = buildSplashRows(save);
  const width = Math.max(...rows.map((row) => row.length), 0);
  return (
    <box flexDirection="column" flexGrow={1} alignItems="center">
      <box flexDirection="column" width={width}>
        {rows.map((row, i) => (
          <text key={`row:${i}`}>{row}</text>
        ))}
      </box>
    </box>
  );
}

export type MenuScreenProps = {
  save: SaveFile;
  onSelect: (choice: MenuChoice) => void;
};

export function MenuScreen({ save, onSelect }: MenuScreenProps): React.ReactElement {
  const items = buildMenuItems(save);
  const choiceItems: ChoiceItem[] = items.map((it) => ({ kind: "choice", key: it.key, label: it.label }));
  const [idx, setIdx] = useState(0);

  useKeyboard((e: KeyEvent) => {
    if (e.name === "up" || e.name === "down") {
      setIdx((i) => navigateChoiceList(choiceItems, i, e.name as "up" | "down"));
    } else if (e.name === "return") {
      const item = items[idx];
      if (item) onSelect(item.key);
    } else if (e.name === "q") {
      onSelect("quit");
    }
  }, { global: true });

  return (
    <Shell
      screen="menu"
      scene={<MenuSplash save={save} />}
      panel={
        <ChoiceList
          items={choiceItems}
          focusedIdx={idx}
          hints="[↑↓] move · [⏎] choose · [q] quit"
        />
      }
    />
  );
}
