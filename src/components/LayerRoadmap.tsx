import React from "react";

export type LayerRoadmapProps = {
  topics: string[];
  activeIdx: number;
  strippedIdxs: number[];
  inHeart: boolean;
};

export type RoadmapRow = { dot: string; label: string; tail: string };

/** Pure row formatter — exported for testing.
 *  - layerIdx === topics.length means the synthetic "heart" row.
 */
export function formatRoadmapRow(
  layerIdx: number,
  topics: string[],
  activeIdx: number,
  strippedIdxs: ReadonlySet<number>,
  inHeart: boolean,
): RoadmapRow {
  const isHeartRow = layerIdx === topics.length;
  if (isHeartRow) {
    return { dot: inHeart ? "▲" : "○", label: "heart", tail: "" };
  }
  const stripped = strippedIdxs.has(layerIdx);
  const active = !inHeart && layerIdx === activeIdx && !stripped;
  const label = topics[layerIdx] ?? "";
  if (stripped) return { dot: "●", label, tail: " ✓" };
  if (active)   return { dot: "●", label, tail: " ▲" };
  return { dot: "○", label, tail: "" };
}

export function LayerRoadmap({ topics, activeIdx, strippedIdxs, inHeart }: LayerRoadmapProps): React.ReactElement {
  const stripped = new Set(strippedIdxs);
  const total = topics.length + 1; // +1 for heart row
  const rows = Array.from({ length: total }, (_, i) =>
    formatRoadmapRow(i, topics, activeIdx, stripped, inHeart),
  );
  return (
    <box flexDirection="column">
      {rows.map((r, i) => (
        <text key={i}>{r.dot} {r.label}{r.tail}</text>
      ))}
    </box>
  );
}
