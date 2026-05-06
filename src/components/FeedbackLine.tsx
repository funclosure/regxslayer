import React from "react";
import { symbolicFor } from "@/game/damage";

export type FeedbackLineProps = {
  vitalsHit: number;
  vitalsTotal: number;
  collateral: number;
  damage: number;
};

/** Pure formatter for the two-line feedback string. Exported for testing. */
export function formatFeedback(props: FeedbackLineProps): { numeric: string; symbolic: string } {
  const sym = symbolicFor(props.damage);
  return {
    numeric: `${props.vitalsHit}/${props.vitalsTotal} vitals · collateral ${props.collateral} · dmg ${props.damage}`,
    symbolic: `${sym.glyph} ${sym.label}`,
  };
}

export function FeedbackLine(props: FeedbackLineProps): React.ReactElement {
  const { numeric, symbolic } = formatFeedback(props);
  return (
    <box flexDirection="column" flexShrink={0}>
      <text>{numeric}</text>
      <text>{symbolic}</text>
    </box>
  );
}
