import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import type { SaveFile } from "@/game/types";

export type MenuChoice = "continue" | "story" | "encounter" | "tutorial" | "stats" | "quit";

export type MenuItem = { key: MenuChoice; label: string };

export const CHAPTERS: ReadonlyArray<{ id: string; short: string; total: number }> = [
  { id: "literals-anchors", short: "Literals", total: 4 },
  { id: "char-classes",     short: "Classes",  total: 4 },
  { id: "quantifiers",      short: "Quants",   total: 4 },
];

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

const LANDING_ART = [
  " ____  _____ ____ __  __ ____  _      _ __   _______ ____",
  "|  _ \\| ____/ ___|\\ \\/ / ___|| |    / \\\\ \\ / / ____|  _ \\",
  "| |_) |  _|| |  _  \\  /\\___ \\| |   / _ \\\\ V /|  _| | |_) |",
  "|  _ <| |__| |_| | /  \\ ___) | |__/ ___ \\| | | |___|  _ <",
  "|_| \\_\\_____\\____|/_/\\_\\____/|____/_/   \\_\\_| |_____|_| \\_\\",
  "",
  "          .----.",
  "      ___/ .  . \\___        [^filler]",
  "     /   \\  --  /   \\       \\w+",
  "     \\____\\____/____/       ^heart$",
  "          /_||_\\",
  "",
  "                    precision is damage",
  "",
];

const LANDING_WIDTH = Math.max(...LANDING_ART.map((row) => row.length));

function padRows(rows: string[], width: number): string[] {
  return rows.map((row) => row.padEnd(width, " "));
}

export function buildMenuRows(items: MenuItem[], selectedIdx: number): string[] {
  const rows = items.map((it, i) => `${i === selectedIdx ? "▶" : " "} ${it.label}`);
  const width = Math.max(...rows.map((row) => row.length), 0);
  return padRows(rows, width);
}

export function buildLandingRows(items: MenuItem[], selectedIdx: number): string[] {
  return [
    ...padRows(LANDING_ART, LANDING_WIDTH),
    ...buildMenuRows(items, selectedIdx),
  ];
}

export type MenuScreenProps = {
  save: SaveFile;
  onSelect: (choice: MenuChoice) => void;
};

export function MenuScreen({ save, onSelect }: MenuScreenProps): React.ReactElement {
  const items = buildMenuItems(save);
  const [idx, setIdx] = useState(0);
  const artRows = padRows(LANDING_ART, LANDING_WIDTH);
  const menuRows = buildMenuRows(items, idx);
  const menuWidth = Math.max(...menuRows.map((row) => row.length), 0);

  useKeyboard((e: KeyEvent) => {
    if (e.name === "up") setIdx((i) => navigateMenu(items.length, i, "up"));
    else if (e.name === "down") setIdx((i) => navigateMenu(items.length, i, "down"));
    else if (e.name === "return") {
      const item = items[idx];
      if (item) onSelect(item.key);
    }
  }, { global: true });

  return (
    <box flexDirection="column" flexGrow={1} padding={2} alignItems="center" justifyContent="center">
      <box flexDirection="column" width={LANDING_WIDTH}>
        {artRows.map((row, i) => (
          <text key={`art:${i}:${row}`}>{row}</text>
        ))}
      </box>
      <box flexDirection="column" width={menuWidth}>
        {menuRows.map((row, i) => (
          <text key={`menu:${i}:${row}`}>{row}</text>
        ))}
      </box>
    </box>
  );
}
