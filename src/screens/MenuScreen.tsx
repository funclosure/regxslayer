import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import type { SaveFile } from "@/game/types";

export type MenuChoice = "continue" | "story" | "encounter" | "tutorial" | "stats" | "quit";

export type MenuItem = { key: MenuChoice; label: string };

export function buildMenuItems(save: SaveFile): MenuItem[] {
  const items: MenuItem[] = [];
  if (save.lastMode !== null) items.push({ key: "continue", label: "Continue" });
  items.push({ key: "story", label: "Story" });
  items.push({ key: "encounter", label: "Encounter" });
  items.push({ key: "tutorial", label: "Tutorial" });
  items.push({ key: "stats", label: "Stats" });
  items.push({ key: "quit", label: "Quit" });
  return items;
}

export function navigateMenu(itemCount: number, currentIdx: number, direction: "up" | "down"): number {
  if (itemCount <= 0) return 0;
  return direction === "down"
    ? (currentIdx + 1) % itemCount
    : (currentIdx + itemCount - 1) % itemCount;
}

export type MenuScreenProps = {
  save: SaveFile;
  onSelect: (choice: MenuChoice) => void;
};

export function MenuScreen({ save, onSelect }: MenuScreenProps): React.ReactElement {
  const items = buildMenuItems(save);
  const [idx, setIdx] = useState(0);

  useKeyboard((e: KeyEvent) => {
    if (e.name === "up") setIdx((i) => navigateMenu(items.length, i, "up"));
    else if (e.name === "down") setIdx((i) => navigateMenu(items.length, i, "down"));
    else if (e.name === "return") {
      const item = items[idx];
      if (item) onSelect(item.key);
    }
  }, { global: true });

  return (
    <box flexDirection="column" padding={2} gap={1}>
      <text>regxslayer</text>
      <text>───────────</text>
      {items.map((it, i) => (
        <text key={it.key}>{i === idx ? "▶ " : "  "}{it.label}</text>
      ))}
    </box>
  );
}
