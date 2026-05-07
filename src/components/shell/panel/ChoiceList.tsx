import React from "react";

export type ChoiceItem =
  | { kind: "section"; label: string }
  | { kind: "choice"; key: string; label: string };

/** Move focus up or down, skipping section headings. Wraps at edges. */
export function navigateChoiceList(
  items: ReadonlyArray<ChoiceItem>,
  currentIdx: number,
  direction: "up" | "down",
): number {
  if (items.length === 0) return 0;
  if (!items.some((it) => it.kind === "choice")) return currentIdx;
  const step = direction === "down" ? 1 : -1;
  let idx = currentIdx;
  for (let i = 0; i < items.length; i++) {
    idx = (idx + step + items.length) % items.length;
    if (items[idx]?.kind === "choice") return idx;
  }
  return currentIdx;
}

export type ScrollWindow = {
  startIdx: number;
  endIdx: number;
  moreAbove: boolean;
  moreBelow: boolean;
};

/** Compute the visible slice of items given a max-row budget. The focused row
 *  is centered when possible; near edges the window anchors to that edge. */
export function computeScrollWindow(
  items: ReadonlyArray<ChoiceItem>,
  focusedIdx: number,
  maxRows: number,
): ScrollWindow {
  if (items.length <= maxRows) {
    return { startIdx: 0, endIdx: items.length, moreAbove: false, moreBelow: false };
  }
  const half = Math.floor(maxRows / 2);
  let startIdx = Math.max(0, focusedIdx - half);
  let endIdx = startIdx + maxRows;
  if (endIdx > items.length) {
    endIdx = items.length;
    startIdx = endIdx - maxRows;
  }
  return {
    startIdx,
    endIdx,
    moreAbove: startIdx > 0,
    moreBelow: endIdx < items.length,
  };
}
