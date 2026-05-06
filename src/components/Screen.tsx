import React from "react";
import { StatusBar } from "@/components/StatusBar";

/** Default inner column width for screens, in characters. */
export const DEFAULT_SCREEN_WIDTH = 64;

export type ScreenProps = {
  children: React.ReactNode;
  /** Right-aligned hint text, e.g. "[esc] back · [?] help". */
  hints: string;
  /** Short screen identifier shown in the status bar, e.g. "stats". */
  screen: string;
  /**
   * Optional pinned content rendered above the StatusBar but outside
   * the scrollbox — for short alerts or confirm prompts that must
   * stay visible regardless of scroll position. Use sparingly; most
   * screens don't need this.
   */
  footer?: React.ReactNode;
  /** Inner column width in characters. Default `DEFAULT_SCREEN_WIDTH` (64). */
  width?: number;
};

/**
 * Standard screen frame: scrollable top-anchored content + optional
 * pinned footer + persistent status bar at the bottom.
 */
export function Screen({
  children,
  hints,
  screen,
  footer,
  width = DEFAULT_SCREEN_WIDTH,
}: ScreenProps): React.ReactElement {
  return (
    <box flexDirection="column" flexGrow={1} width="100%">
      <scrollbox flexGrow={1}>
        <box flexDirection="column" alignItems="center">
          <box flexDirection="column" width={width}>
            {children}
          </box>
        </box>
      </scrollbox>
      {footer ? (
        <box flexDirection="column" alignItems="center">
          <box flexDirection="column" width={width}>
            {footer}
          </box>
        </box>
      ) : null}
      <StatusBar screen={screen} hints={hints} />
    </box>
  );
}
