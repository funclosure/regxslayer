/** Pure formatter for the single-row status line. The Shell renders this directly
 *  via `formatStatusInfoRow`; there is no React component wrapper anymore. */

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

