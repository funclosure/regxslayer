import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { ATTR_DIM } from "@/components/style";
import { InputPanel, panelTextRow } from "@/components/shell/InputPanel";
import { computeShellWidth } from "@/components/shell/Shell";

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

/** Maximum rows the choice list takes inside the panel body — half the terminal height. */
function maxBodyRows(termHeight: number): number {
  return Math.max(3, Math.floor(termHeight / 2) - 3); // 3 chrome rows: top + footer + bottom
}

export type ChoiceListProps = {
  items: ReadonlyArray<ChoiceItem>;
  focusedIdx: number;
  /** Optional panel header label. */
  header?: string;
  /** Footer hints, e.g. "[↑↓] move · [⏎] choose". */
  hints: string;
  capWidth?: boolean;
};

/** `choice` panel mode. Renders the items vertically inside the bordered panel,
 *  with the focused row marked by `▶`. Sections render as non-cursor headings.
 *  Long lists scroll inside the panel; ▲/▼ indicators appear at boundaries. */
export function ChoiceList(props: ChoiceListProps): React.ReactElement {
  const { items, focusedIdx, header, hints, capWidth = true } = props;
  const { width: termWidth, height: termHeight } = useTerminalDimensions();
  const width = computeShellWidth(termWidth, capWidth);
  const maxRows = maxBodyRows(termHeight);
  const win = computeScrollWindow(items, focusedIdx, maxRows);

  // Build rows for the visible slice. Boundary indicators replace the first/last row when active.
  const rows: string[] = [];
  for (let i = win.startIdx; i < win.endIdx; i++) {
    const item = items[i]!;
    if (i === win.startIdx && win.moreAbove) {
      rows.push(panelTextRow(width, "  ▲ more above"));
      continue;
    }
    if (i === win.endIdx - 1 && win.moreBelow) {
      rows.push(panelTextRow(width, "  ▼ more below"));
      continue;
    }
    if (item.kind === "section") {
      rows.push(panelTextRow(width, "  " + item.label));
      continue;
    }
    const cursor = i === focusedIdx ? "▶ " : "  ";
    rows.push(panelTextRow(width, cursor + item.label));
  }

  return (
    <InputPanel width={width} header={header} hints={hints}>
      {rows.map((r, i) => {
        // Section rows render dim; choice + cursor rows render at default weight.
        const visibleIdx = win.startIdx + i;
        const item = items[visibleIdx];
        const isSection = item?.kind === "section";
        const isBoundary =
          (i === 0 && win.moreAbove) || (i === rows.length - 1 && win.moreBelow);
        if (isSection || isBoundary) {
          return React.createElement("text", { key: `r:${i}` },
            React.createElement("span", { style: { attributes: ATTR_DIM } }, r),
          );
        }
        return <text key={`r:${i}`}>{r}</text>;
      })}
    </InputPanel>
  );
}
