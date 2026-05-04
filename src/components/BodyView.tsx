import React from "react";
import type { Monster } from "@/game/types";

export type BodyViewProps = {
  monster: Monster;
  activeLayerIdx: number;
  strippedIdxs: number[];
  inHeart: boolean;
  matchedKeys: ReadonlySet<string>;
};

export type BodyRow = {
  gutter: string;
  prefix: string;
  display: string;
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
}): BodyRow {
  const { kind, layerIdx, lineIdx, text, vital, activeLayerIdx, stripped, inHeart, matchedKeys } = args;

  if (kind === "heart") {
    const matched = matchedKeys.has("heart");
    return {
      gutter: inHeart ? "♦" : " ",
      prefix: "",
      display: matched ? `›${text}‹` : text,
    };
  }

  const isStripped = stripped.has(layerIdx);
  const isActive = !inHeart && layerIdx === activeLayerIdx && !isStripped;
  const isLocked = !inHeart && layerIdx > activeLayerIdx;

  const gutter =
    isStripped ? " " :
    isActive   ? (vital ? "♦" : " ") :
    isLocked   ? "⛓" :
    " ";

  const matched = matchedKeys.has(`${layerIdx}:${lineIdx}`);
  return {
    gutter,
    prefix: isStripped ? "[STRIPPED] " : "",
    display: matched ? `›${text}‹` : text,
  };
}

export function BodyView(props: BodyViewProps): React.ReactElement {
  const { monster, activeLayerIdx, strippedIdxs, inHeart, matchedKeys } = props;
  const stripped = new Set(strippedIdxs);

  return (
    <box flexDirection="column">
      {monster.layers.map((layer, li) => (
        <box flexDirection="column" key={li}>
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
            return <text key={i}>{row.gutter} {row.prefix}{row.display}</text>;
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
        });
        return <text>{row.gutter} {row.prefix}{row.display}</text>;
      })()}
    </box>
  );
}
