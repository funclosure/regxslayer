import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { TRAITS } from "@/game/traits";
import { classify, sortTraits } from "@/game/stats";
import type { SaveFile, TraitStat } from "@/game/types";
import type { Trait } from "@/game/traits";

export type StatsScreenProps = {
  save: SaveFile;
  onReset: () => void;       // caller wires resetStats + setSave
  onBack: () => void;
};

const TRAIT_COL = 18;

/** Pure renderer for one row — exported for testing. */
export function renderStatsRowText(trait: Trait, stat: TraitStat): string {
  const c = classify(stat);
  const total = stat.perfectStrips + stat.nonPerfectTries;
  const counts = `${stat.perfectStrips}/${total}`;
  const pct = c.rate === null ? "    " : `${Math.round(c.rate * 100).toString().padStart(3)}%`;
  return `${c.flag} ${trait.padEnd(TRAIT_COL)} ${counts.padEnd(8)} ${pct}   ${c.label}`;
}

export function StatsScreen({ save, onReset, onBack }: StatsScreenProps): React.ReactElement {
  const [confirming, setConfirming] = useState(false);

  useKeyboard((e: KeyEvent) => {
    if (confirming) {
      if (e.name === "y") {
        setConfirming(false);
        onReset();
      } else {
        setConfirming(false);
      }
      return;
    }
    if (e.name === "r") setConfirming(true);
    else if (e.name === "escape") onBack();
  }, { global: true });

  const rows = sortTraits(save.traitStats, TRAITS);
  const total = save.storyKills + save.encounterKills;

  return (
    <box flexDirection="column" padding={1} gap={0}>
      <text>STATS  ([esc] back)</text>
      <text>───────────────────</text>
      <text>Lifetime: {total} monsters slain (story {save.storyKills} · encounter {save.encounterKills})</text>
      <text>Sessions: {save.encounterSessions} encounter runs</text>
      <text> </text>
      <text>Trait practice (sorted: needs-practice → strong)</text>
      <text>─────────────────────────────────────────────────</text>
      {rows.map((r) => (
        <text key={r.trait}>{renderStatsRowText(r.trait, r.stat)}</text>
      ))}
      <text> </text>
      {confirming
        ? <text>Reset all trait stats? This cannot be undone. [y]es / [n]o (default)</text>
        : <text>[r] reset stats     [esc] back</text>}
    </box>
  );
}
