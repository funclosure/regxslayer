import type { Trait } from "./traits";
import type { TraitStat } from "./types";

export type Classified = {
  flag: string;        // "⚠" or " "
  label: "no practice yet" | "needs practice" | "shaky" | "strong";
  rate: number | null; // null when total === 0
};

const STATISTICAL_FLOOR = 3;

export function classify(stat: TraitStat): Classified {
  const total = stat.perfectStrips + stat.nonPerfectTries;
  if (total === 0) {
    return { flag: "⚠", label: "no practice yet", rate: null };
  }
  const rate = stat.perfectStrips / total;
  if (total < STATISTICAL_FLOOR) {
    return { flag: "⚠", label: "needs practice", rate };
  }
  if (rate < 0.5) return { flag: "⚠", label: "needs practice", rate };
  if (rate < 0.8) return { flag: " ", label: "shaky", rate };
  return { flag: " ", label: "strong", rate };
}

export type StatsRow = { trait: Trait; stat: TraitStat; row: Classified };

const BAND_ORDER: Record<Classified["label"], number> = {
  "no practice yet": 0,
  "needs practice": 1,
  "shaky": 2,
  "strong": 3,
};

export function sortTraits(
  stats: Record<string, TraitStat>,
  allTraits: readonly Trait[],
): StatsRow[] {
  const rows: StatsRow[] = allTraits.map((t) => {
    const stat = stats[t] ?? { perfectStrips: 0, nonPerfectTries: 0 };
    return { trait: t, stat, row: classify(stat) };
  });
  rows.sort((a, b) => {
    const bandDelta = BAND_ORDER[a.row.label] - BAND_ORDER[b.row.label];
    if (bandDelta !== 0) return bandDelta;
    // Within band, sort ascending by rate (worst first).
    const ar = a.row.rate ?? -1;
    const br = b.row.rate ?? -1;
    return ar - br;
  });
  return rows;
}

const TRAIT_COL_WIDTH = 18;

export function formatStatsRow(trait: Trait, c: Classified): string {
  // We don't have raw counts in Classified — caller-side: a higher-fidelity
  // formatter is in StatsScreen.tsx. This standalone helper is for testing
  // the visible parts (label, percentage) reproducibly.
  const traitCol = trait.padEnd(TRAIT_COL_WIDTH);
  const pct = c.rate === null ? "" : `${Math.round(c.rate * 100)}%`;
  return `${c.flag} ${traitCol} ${pct.padStart(4)}   ${c.label}`;
}
