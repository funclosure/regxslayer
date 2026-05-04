import React from "react";
import { portraits } from "@/content/portraits";

const FALLBACK = ["???", "???", "???"];

export type MonsterPortraitProps = {
  name: string;
};

/** Pure lookup, exported for testing. */
export function getPortraitLines(name: string): string[] {
  return portraits[name] ?? FALLBACK;
}

export function MonsterPortrait({ name }: MonsterPortraitProps): React.ReactElement {
  const lines = getPortraitLines(name);
  return (
    <box flexDirection="column">
      {lines.map((l, i) => (
        <text key={i}>{l}</text>
      ))}
    </box>
  );
}
