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
  /** The line text without any decoration. The component renders this in a colored span when `matched` is true. */
  text: string;
  /** True when the player's regex matches this line. Used for colorisation, no longer for inline brackets (which caused horizontal jitter). */
  matched: boolean;
  /** Whether this line is "good to match" (vital on the active layer or the heart in heart phase) vs collateral (filler / locked / heart-during-layer / non-heart-during-heart). */
  matchKind: "vital" | "collateral";
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
      text,
      matched,
      matchKind: inHeart ? "vital" : "collateral",
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
  // "Good" matches: vital lines on the active (not stripped, not locked) layer.
  // Anything else that matches is collateral (filler on active, anything on locked, anything stripped).
  const matchKind: BodyRow["matchKind"] = (isActive && vital) ? "vital" : "collateral";
  return {
    gutter,
    prefix: isStripped ? "[STRIPPED] " : "",
    text,
    matched,
    matchKind,
  };
}

const VITAL_HIT_COLOR = "#4dffaa";        // green — good
const COLLATERAL_HIT_COLOR = "#ff6b6b";   // red — bad

export function BodyView(props: BodyViewProps): React.ReactElement {
  const { monster, activeLayerIdx, strippedIdxs, inHeart, matchedKeys } = props;
  const stripped = new Set(strippedIdxs);

  const renderRow = (key: string | number, row: BodyRow): React.ReactElement => {
    const fg = row.matchKind === "vital" ? VITAL_HIT_COLOR : COLLATERAL_HIT_COLOR;
    // gridland's <span> takes a `style` object with { fg, bg } — but React's HTML
    // <span> typing claims the intrinsic with CSS Properties and our augmentation
    // can't override that. Use createElement to bypass the JSX type-check
    // (same workaround as <input> in RegexInput).
    const colored = row.matched
      ? React.createElement("span", { style: { fg } }, row.text)
      : row.text;
    return (
      <text key={key}>
        {row.gutter} {row.prefix}{colored}
      </text>
    );
  };

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
            return renderRow(i, row);
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
        return renderRow("heart", row);
      })()}
    </box>
  );
}
