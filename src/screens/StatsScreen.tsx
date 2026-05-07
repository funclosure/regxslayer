import React, { useState } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { Prompt } from "@/components/shell/panel/Prompt";
import { ChoiceList, navigateChoiceList, type ChoiceItem } from "@/components/shell/panel/ChoiceList";
import { TRAITS } from "@/game/traits";
import { classify, sortTraits } from "@/game/stats";
import type { SaveFile, TraitStat } from "@/game/types";
import type { Trait } from "@/game/traits";

export type StatsScreenProps = {
  save: SaveFile;
  onReset: () => void;
  onBack: () => void;
};

const TRAIT_COL = 18;

export function renderStatsRowText(trait: Trait, stat: TraitStat): string {
  const c = classify(stat);
  const total = stat.perfectStrips + stat.nonPerfectTries;
  const counts = `${stat.perfectStrips}/${total}`;
  const pct = c.rate === null ? "    " : `${Math.round(c.rate * 100).toString().padStart(3)}%`;
  return `${c.flag} ${trait.padEnd(TRAIT_COL)} ${counts.padEnd(8)} ${pct}   ${c.label}`;
}

const CONFIRM_ITEMS: ChoiceItem[] = [
  { kind: "choice", key: "no", label: "No, keep them" },
  { kind: "choice", key: "yes", label: "Yes, reset" },
];

export function StatsScreen({ save, onReset, onBack }: StatsScreenProps): React.ReactElement {
  const [confirming, setConfirming] = useState(false);
  const [confirmIdx, setConfirmIdx] = useState(0); // default to "No"

  useKeyboard((e: KeyEvent) => {
    if (confirming) {
      if (e.name === "up" || e.name === "down") {
        setConfirmIdx((i) => navigateChoiceList(CONFIRM_ITEMS, i, e.name as "up" | "down"));
      } else if (e.name === "return") {
        const item = CONFIRM_ITEMS[confirmIdx];
        setConfirming(false);
        if (item?.kind === "choice" && item.key === "yes") onReset();
      } else if (e.name === "escape") {
        setConfirming(false);
      }
      return;
    }
    if (e.name === "r") setConfirming(true);
    else if (e.name === "escape") onBack();
  }, { global: true });

  const rows = sortTraits(save.traitStats, TRAITS);
  const total = save.storyKills + save.encounterKills;

  const scene = (
    <SceneFrame>
      <box flexDirection="column" gap={0}>
        <text>STATS</text>
        <text>─────</text>
        <text>Lifetime: {total} monsters slain (story {save.storyKills} · encounter {save.encounterKills})</text>
        <text>Sessions: {save.encounterSessions} encounter runs</text>
      </box>
      <text> </text>
      <box flexDirection="column" gap={0}>
        <text>Trait practice (sorted: needs-practice → strong)</text>
        <text>─────────────────────────────────────────────────</text>
        {rows.map((r) => (
          <text key={r.trait}>{renderStatsRowText(r.trait, r.stat)}</text>
        ))}
      </box>
    </SceneFrame>
  );

  const panel = confirming ? (
    <ChoiceList
      items={CONFIRM_ITEMS}
      focusedIdx={confirmIdx}
      header="Reset all trait stats? This cannot be undone."
      hints="[↑↓] move · [⏎] confirm · [esc] cancel"
    />
  ) : (
    <Prompt hint="[r] reset · [esc] back" />
  );

  return <Shell screen="stats" scene={scene} panel={panel} />;
}
