import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";

export type MenuChoice = "continue" | "new" | "quit";
const ITEMS: { key: MenuChoice; label: string }[] = [
  { key: "continue", label: "Continue" },
  { key: "new", label: "New Game" },
  { key: "quit", label: "Quit" },
];

/** Pure index updater — exported for testing. */
export function navigateMenu(itemCount: number, currentIdx: number, direction: "up" | "down"): number {
  if (itemCount <= 0) return 0;
  return direction === "down"
    ? (currentIdx + 1) % itemCount
    : (currentIdx + itemCount - 1) % itemCount;
}

export type MenuScreenProps = {
  onSelect: (choice: MenuChoice) => void;
};

export function MenuScreen({ onSelect }: MenuScreenProps): React.ReactElement {
  const [idx, setIdx] = useState(0);
  useKeyboard((e: KeyEvent) => {
    if (e.name === "up") setIdx((i) => navigateMenu(ITEMS.length, i, "up"));
    else if (e.name === "down") setIdx((i) => navigateMenu(ITEMS.length, i, "down"));
    else if (e.name === "return") onSelect(ITEMS[idx]!.key);
  }, { global: true });

  return (
    <box flexDirection="column" padding={2} gap={1}>
      <text>regxslayer</text>
      <text>───────────</text>
      {ITEMS.map((it, i) => (
        <text key={it.key}>{i === idx ? "▶ " : "  "}{it.label}</text>
      ))}
    </box>
  );
}
