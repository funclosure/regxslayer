import React from "react";

/** Build the inner span between two corners, optionally including a labeled prefix.
 *  prefix examples: "─ Header ", " ─ hints ".
 *  Returns a string of exactly `innerWidth` characters. */
function buildLabeledRule(innerWidth: number, prefix?: string): string {
  if (innerWidth <= 0) return "";
  if (!prefix) return "─".repeat(innerWidth);
  const codepoints = [...prefix];
  if (codepoints.length >= innerWidth) {
    // Prefix doesn't fit cleanly; truncate so output is exactly innerWidth.
    return codepoints.slice(0, innerWidth).join("");
  }
  return prefix + "─".repeat(innerWidth - codepoints.length);
}

/** Top border with rounded corners. Optional header label appears as "╭─ <label> ─…─╮". */
export function formatPanelTopBorder(width: number, header?: string): string {
  if (width < 2) return "";
  const innerWidth = width - 2;
  const prefix = header ? `─ ${header} ` : undefined;
  return "╭" + buildLabeledRule(innerWidth, prefix) + "╮";
}

/** Bottom border with rounded corners. Always plain dashes. */
export function formatPanelBottomBorder(width: number): string {
  if (width < 2) return "";
  return "╰" + "─".repeat(width - 2) + "╯";
}

/** Internal footer rule (above the bottom border). The pipe characters at each end
 *  match the body-row side borders; the inner span is "─ <hints> ─…─" or all dashes. */
export function formatPanelFooterRule(width: number, hints?: string): string {
  if (width < 2) return "";
  const innerWidth = width - 2;
  const prefix = hints ? ` ─ ${hints} ` : undefined;
  return "│" + buildLabeledRule(innerWidth, prefix) + "│";
}

export type InputPanelProps = {
  /** Total panel width in characters. */
  width: number;
  /** Optional label baked into the top border. */
  header?: string;
  /** Optional hint string baked into the footer rule. Omit to skip the footer rule. */
  hints?: string;
  /** Body row(s). Each child should be a single-row element rendered with side borders. */
  children: React.ReactNode;
};

/**
 * Wrap a single body row with side borders + 1-col padding on each side.
 * Use for rows containing dynamic React elements (e.g. <input>, <span>).
 * For pure-text rows, use {@link panelTextRow} instead — it pads the string
 * to width so the right border lands at the right edge.
 */
export function PanelRow(props: { width: number; children: React.ReactNode }): React.ReactElement {
  return (
    <box flexDirection="row" width={props.width}>
      <text>│ </text>
      <box flexGrow={1}>{props.children}</box>
      <text> │</text>
    </box>
  );
}

/** Format a fully-padded panel body row from a string. Inner width = width - 4
 *  (2 borders + 1 col padding on each side). The returned string is exactly
 *  `width` characters wide. */
export function panelTextRow(width: number, content: string): string {
  if (width < 4) return "";
  const innerWidth = width - 4;
  const trimmed = [...content].slice(0, innerWidth).join("");
  const padded = trimmed + " ".repeat(Math.max(0, innerWidth - [...trimmed].length));
  return "│ " + padded + " │";
}

/** Bordered chrome for the input panel. Renders top border (with optional header),
 *  children (each child should be a row of width `width`), optional footer rule,
 *  and bottom border. */
export function InputPanel(props: InputPanelProps): React.ReactElement {
  const { width, header, hints, children } = props;
  return (
    <box flexDirection="column" flexShrink={0} width={width}>
      <text>{formatPanelTopBorder(width, header)}</text>
      {children}
      {hints !== undefined ? <text>{formatPanelFooterRule(width, hints)}</text> : null}
      <text>{formatPanelBottomBorder(width)}</text>
    </box>
  );
}
