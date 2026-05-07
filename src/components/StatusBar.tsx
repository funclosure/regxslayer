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

export type StatusBarProps = {
  screen: string;
};

/** Single-row status: brand · screen · slain · sessions, dashes filling the rest.
 *  No hint row — hints live in the input panel footer. */
export function StatusBar({ screen }: StatusBarProps): React.ReactElement {
  const { width } = useTerminalDimensions();
  const { slain, sessions } = useSaveLifetime();
  return <text>{formatStatusInfoRow(BRAND, screen, slain, sessions, width)}</text>;
}
