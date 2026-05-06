import React from "react";
import type { MatchRange, Monster } from "@/game/types";
import {
  ATTR_STRIPPED,
  ATTR_UNDERLINE,
  DANGER_COLOR,
  POSITIVE_COLOR,
} from "@/components/style";

export type BodyViewProps = {
  monster: Monster;
  activeLayerIdx: number;
  strippedIdxs: number[];
  inHeart: boolean;
  matchedKeys: ReadonlySet<string>;
  /** Per-line match ranges (start, end) for substring highlighting. Empty array = matched but no underlineable substring (e.g. ^/$ anchor). */
  matchedRanges?: ReadonlyMap<string, ReadonlyArray<MatchRange>>;
  /** True during the kill phase: render the heart row as a stripped vital (green + dim + strike). */
  heartKilled?: boolean;
};

export type BodyRow = {
  gutter: string;
  /** The line text without any decoration. */
  text: string;
  /** True when the player's regex matches this line. */
  matched: boolean;
  /** Whether this line is "good to match" vs collateral. */
  matchKind: "vital" | "collateral";
  /** True when this row's layer has been stripped — renders dim + strikethrough. */
  stripped: boolean;
  /** Original vitality of the line (independent of layer state). Stripped vitals
   *  render in POSITIVE_COLOR so the kill is celebrated visually. */
  vital: boolean;
};

/** Pure formatter for one body row, exported for testing.
 *  When `kind === "heart"`, layerIdx and lineIdx are ignored. */
export function formatBodyRow(args: {
  kind: "layer" | "heart";
  layerIdx: number;
  lineIdx: number;
  text: string;
  vital: boolean;
  activeLayerIdx: number;
  stripped: ReadonlySet<number>;
  inHeart: boolean;
  matchedKeys: ReadonlySet<string>;
  heartKilled?: boolean;
}): BodyRow {
  const { kind, layerIdx, lineIdx, text, vital, activeLayerIdx, stripped, inHeart, matchedKeys, heartKilled } = args;

  if (kind === "heart") {
    const matched = matchedKeys.has("heart");
    if (heartKilled) {
      // Heart kill = treat the heart row identically to a stripped vital so it
      // gets the same green + dim + strike celebration.
      return {
        gutter: "·",
        text,
        matched,
        matchKind: "vital",
        stripped: true,
        vital,
      };
    }
    return {
      gutter: inHeart ? "♦" : " ",
      text,
      matched,
      matchKind: inHeart ? "vital" : "collateral",
      stripped: false,
      vital,
    };
  }

  const isStripped = stripped.has(layerIdx);
  const isActive = !inHeart && layerIdx === activeLayerIdx && !isStripped;
  const isLocked = !inHeart && layerIdx > activeLayerIdx;

  // Gutter glyphs are always visible regardless of theme — they're the
  // accessibility-safe fallback when ANSI dim doesn't render well (e.g. light
  // terminals where dim is nearly invisible).
  const gutter =
    isStripped ? "·" :
    isActive   ? (vital ? "♦" : " ") :
    isLocked   ? "⛓" :
    " ";

  const matched = matchedKeys.has(`${layerIdx}:${lineIdx}`);
  const matchKind: BodyRow["matchKind"] = (isActive && vital) ? "vital" : "collateral";
  return {
    gutter,
    text,
    matched,
    matchKind,
    stripped: isStripped,
    vital,
  };
}

/** Split a string into alternating [unmatched, matched, unmatched, ...] segments
 *  given a sorted list of half-open ranges. Exported for testing. */
export type Segment = { text: string; matched: boolean };
export function splitByRanges(text: string, ranges: ReadonlyArray<MatchRange>): Segment[] {
  if (ranges.length === 0) return [{ text, matched: false }];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of sorted) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }
  const out: Segment[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) out.push({ text: text.slice(cursor, s), matched: false });
    if (e > s)     out.push({ text: text.slice(s, e), matched: true });
    cursor = e;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), matched: false });
  return out;
}

export function BodyView(props: BodyViewProps): React.ReactElement {
  const { monster, activeLayerIdx, strippedIdxs, inHeart, matchedKeys, matchedRanges, heartKilled } = props;
  const stripped = new Set(strippedIdxs);
  const ranges = matchedRanges ?? new Map<string, ReadonlyArray<MatchRange>>();

  const renderRow = (key: string | number, lineKey: string, row: BodyRow): React.ReactElement => {
    // Stripped rows: dim + strikethrough; stripped vitals also get POSITIVE_COLOR
    // so the kill remains visually distinct from collateral fillers.
    if (row.stripped) {
      const style = row.vital
        ? { fg: POSITIVE_COLOR, attributes: ATTR_STRIPPED }
        : { attributes: ATTR_STRIPPED };
      const strippedText = React.createElement("span", { style }, row.text);
      return (
        <text key={key}>
          {row.gutter} {strippedText}
        </text>
      );
    }

    const fg = row.matchKind === "vital" ? POSITIVE_COLOR : DANGER_COLOR;
    const lineRanges = row.matched ? (ranges.get(lineKey) ?? []) : [];

    // Matched but no substring (e.g. ^/$ anchor): color whole line.
    if (row.matched && lineRanges.length === 0) {
      const colored = React.createElement("span", { style: { fg } }, row.text);
      return (
        <text key={key}>
          {row.gutter} {colored}
        </text>
      );
    }
    if (!row.matched) {
      return (
        <text key={key}>
          {row.gutter} {row.text}
        </text>
      );
    }
    // Substring highlight: matched chars get fg + UNDERLINE.
    const segments = splitByRanges(row.text, lineRanges);
    const children = segments.map((seg, idx) =>
      seg.matched
        ? React.createElement("span", { key: idx, style: { fg, attributes: ATTR_UNDERLINE } }, seg.text)
        : seg.text,
    );
    return (
      <text key={key}>
        {row.gutter} {children}
      </text>
    );
  };

  return (
    <box flexDirection="column" flexShrink={0}>
      {monster.layers.map((layer, li) => (
        <box flexDirection="column" key={li} flexShrink={0}>
          {layer.lines.map((line, i) => {
            const row = formatBodyRow({
              kind: "layer",
              layerIdx: li,
              lineIdx: i,
              text: line.text,
              vital: line.vital,
              activeLayerIdx,
              stripped,
              inHeart,
              matchedKeys,
            });
            return renderRow(i, `${li}:${i}`, row);
          })}
        </box>
      ))}
      {(() => {
        const row = formatBodyRow({
          kind: "heart",
          layerIdx: -1,
          lineIdx: -1,
          text: monster.heart.text,
          vital: true,
          activeLayerIdx,
          stripped,
          inHeart,
          matchedKeys,
          heartKilled,
        });
        return renderRow("heart", "heart", row);
      })()}
    </box>
  );
}
