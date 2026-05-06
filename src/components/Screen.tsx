import React from "react";
import { ChromeBar } from "@/components/ChromeBar";

/** Default inner column width for screens, in characters. */
export const DEFAULT_SCREEN_WIDTH = 64;

export type ScreenProps = {
  children: React.ReactNode;
  /** Right-aligned chrome hint, e.g. "[esc] back · [?] help". */
  hints: string;
  /** Inner column width in characters. Default `DEFAULT_SCREEN_WIDTH` (64). */
  width?: number;
};

/**
 * Standard screen frame: chrome bar on top + a centered, fixed-width
 * inner column that fills the remaining height. Children control where
 * vertical slack is absorbed (use `<box flexGrow={1} />` for an empty
 * gap or `<scrollbox flexGrow={1}>` to scroll long content).
 */
export function Screen({
  children,
  hints,
  width = DEFAULT_SCREEN_WIDTH,
}: ScreenProps): React.ReactElement {
  return (
    <box flexDirection="column" flexGrow={1} width="100%">
      <ChromeBar hints={hints} />
      <box flexDirection="column" flexGrow={1} alignItems="center" padding={2}>
        <box flexDirection="column" width={width} flexGrow={1} gap={1}>
          {children}
        </box>
      </box>
    </box>
  );
}
