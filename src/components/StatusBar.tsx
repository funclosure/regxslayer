import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { useSaveLifetime } from "@/components/SaveContext";

export const BRAND = "regxslayer";

const PREFIX_DASHES = 3;
const SIDE_SPACE = 1;
const MIN_TRAILING_DASHES = 2;

function tryInfoRow(parts: readonly string[], width: number): string | null {
  const content = parts.join(" · ");
  const left = `${"─".repeat(PREFIX_DASHES)}${" ".repeat(SIDE_SPACE)}${content}${" ".repeat(SIDE_SPACE)}`;
  if (left.length + MIN_TRAILING_DASHES > width) return null;
  return left + "─".repeat(width - left.length);
}

/**
 * Pure builder for the status info row. Drops segments right-to-left
 * (sessions → slain → screen) when the terminal can't fit the full row.
 * Brand stays visible at any width; below brand-only the brand is
 * truncated rather than disappearing.
 */
export function formatStatusInfoRow(
  brand: string,
  screen: string,
  slain: number,
  sessions: number,
  width: number,
): string {
  const slainPart = `${slain} slain`;
  const sessionsPart = `${sessions} sessions`;
  const candidates: string[][] = [
    [brand, screen, slainPart, sessionsPart],
    [brand, screen, slainPart],
    [brand, screen],
    [brand],
  ];
  for (const parts of candidates) {
    const row = tryInfoRow(parts, width);
    if (row !== null) return row;
  }
  if (brand.length <= width) return brand + "─".repeat(width - brand.length);
  return brand.slice(0, width);
}

/**
 * Pure builder for the status hint row. Always returns exactly `width`
 * characters so the status block height is constant (preserves vertical
 * rhythm).
 */
export function formatStatusHintRow(hints: string, width: number): string {
  if (hints === "") return " ".repeat(width);
  const padded = ` ${hints}`;
  if (padded.length >= width) return padded.slice(0, width);
  return padded + " ".repeat(width - padded.length);
}

export type StatusBarProps = {
  /** Short screen identifier shown after the brand, e.g. "stats". */
  screen: string;
  /** Hints line, e.g. "[r] reset · [esc] back". */
  hints: string;
};

export function StatusBar({ screen, hints }: StatusBarProps): React.ReactElement {
  const { width } = useTerminalDimensions();
  const { slain, sessions } = useSaveLifetime();
  return (
    <box flexDirection="column" width="100%">
      <text>{formatStatusInfoRow(BRAND, screen, slain, sessions, width)}</text>
      <text>{formatStatusHintRow(hints, width)}</text>
    </box>
  );
}
