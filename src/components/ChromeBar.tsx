import React from "react";
import { useTerminalDimensions } from "@gridland/utils";

export const BRAND = "regxslayer";

const DASH_PADDING = 3;

/**
 * Pure builder for the chrome row text. Falls back to empty-hints form
 * (brand + dashes only) when the terminal is too narrow to fit
 * `brand + hints + 12` chars.
 */
export function formatChromeRow(brand: string, hints: string, width: number): string {
  const leftSegment = `${"─".repeat(DASH_PADDING)} ${brand} `;
  if (hints === "" || width < brand.length + hints.length + 12) {
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
    <box>
      <text>{formatChromeRow(BRAND, hints, width)}</text>
    </box>
  );
}
