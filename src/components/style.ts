/**
 * Shared display constants used across components and screens.
 *
 * Colors: hex strings; gridland's `<box>`/`<span>` accept these via
 * `style={{ fg }}` / `style={{ bg }}`.
 *
 * Attributes: bitfield flags from gridland's TextAttributes enum, applied
 * via `style={{ attributes: ATTR_X | ATTR_Y }}` on `<span>`.
 */

/** Vital match / good outcome (layer strip succeeded). */
export const POSITIVE_COLOR = "#4dffaa";

/** Collateral match / destructive outcome (heart slain). */
export const DANGER_COLOR = "#ff6b6b";

/** Neutral mid-gray for shimmer trough — readable on both dark and light terminals. */
export const SHIMMER_BASE_COLOR = "#9a9a9a";

// gridland TextAttributes bitfield (mirrors @gridland/bun's TextAttributes enum).
export const ATTR_BOLD          = 1 << 0;
export const ATTR_DIM           = 1 << 1;
export const ATTR_ITALIC        = 1 << 2;
export const ATTR_UNDERLINE     = 1 << 3;
export const ATTR_STRIKETHROUGH = 1 << 7;

/** Stripped layer rows: dim + strikethrough on the line text. */
export const ATTR_STRIPPED = ATTR_DIM | ATTR_STRIKETHROUGH;

/**
 * Linearly interpolate two `#rrggbb` hex colors. `mix` is clamped to 0..1
 * (0 → a, 1 → b). Returns a fresh `#rrggbb` string.
 */
export function blendHex(a: string, b: string, mix: number): string {
  const m = Math.max(0, Math.min(1, mix));
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * m);
  const g = Math.round(ag + (bg - ag) * m);
  const bl = Math.round(ab + (bb - ab) * m);
  const hh = (n: number): string => n.toString(16).padStart(2, "0");
  return `#${hh(r)}${hh(g)}${hh(bl)}`;
}
