import React from "react";
import { useTerminalDimensions } from "@gridland/utils";

export const BRAND = "regxslayer";

const DASH_PADDING = 3;       // dashes flanking each side
const SPACE_PADDING = 4;      // 2 spaces around brand + 2 around hints
const MIN_MIDDLE_DASHES = 2;  // visual minimum between brand and hints

/**
 * Pure builder for the chrome row text. Falls back to empty-hints form
 * (brand + dashes only) when the terminal is too narrow to fit the
 * full `─── brand <middle dashes> hints ───` shape.
 */
export function formatChromeRow(brand: string, hints: string, width: number): string {
  const minForHints =
    brand.length + hints.length + 2 * DASH_PADDING + SPACE_PADDING + MIN_MIDDLE_DASHES;
  const leftSegment = `${"─".repeat(DASH_PADDING)} ${brand} `;
  if (hints === "" || width < minForHints) {
    const filling = "─".repeat(Math.max(0, width - leftSegment.length));
    return leftSegment + filling;
  }
  const rightSegment = ` ${hints} ${"─".repeat(DASH_PADDING)}`;
  const middleDashes = "─".repeat(width - leftSegment.length - rightSegment.length);
  return leftSegment + middleDashes + rightSegment;
}

export type ChromeBarProps = {
  /** Right-aligned hint text, e.g. "[esc] back · [?] help". */
  hints: string;
};

export function ChromeBar({ hints }: ChromeBarProps): React.ReactElement {
  const { width } = useTerminalDimensions();
  return (
    <box width="100%">
      <text>{formatChromeRow(BRAND, hints, width)}</text>
    </box>
  );
}
