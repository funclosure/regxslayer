import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { useSaveLifetime } from "@/components/SaveContext";
import { formatStatusInfoRow, BRAND } from "@/components/StatusBar";

/** Cap width applied to non-combat shells on wide terminals. */
export const SHELL_MAX_WIDTH = 140;

/** Pure: returns the effective shell width given the terminal width and cap policy. */
export function computeShellWidth(terminalWidth: number, capWidth: boolean): number {
  if (!capWidth) return terminalWidth;
  return Math.min(terminalWidth, SHELL_MAX_WIDTH);
}

export type ShellProps = {
  /** Free-form scene region (above status + panel). Owns its own layout. */
  scene: React.ReactNode;
  /** A panel-mode element: <Prompt/>, <ChoiceList/>, <TextInput/>, <BannerSlot/>, <Cheatsheet/>. */
  panel: React.ReactElement<{ capWidth?: boolean }>;
  /** Short screen identifier (e.g. "menu", "combat"). Renders in the status row. */
  screen: string;
  /** When false (combat only), the shell stretches to the full terminal width. Default true. */
  capWidth?: boolean;
};

export function Shell(props: ShellProps): React.ReactElement {
  const { scene, panel, screen, capWidth = true } = props;
  const { width } = useTerminalDimensions();
  const shellWidth = computeShellWidth(width, capWidth);

  // Status row is rendered inline here (not via <StatusBar>) so the new shell stays
  // single-row even while the legacy Screen wrapper still emits the two-row StatusBar.
  // Stage 5 cleanup deletes the legacy hint row entirely.
  const { slain, sessions } = useSaveLifetime();
  const status = formatStatusInfoRow(BRAND, screen, slain, sessions, shellWidth);

  // Inject capWidth into the panel so its internal width matches the shell — caller
  // never has to remember to pass capWidth to both. cloneElement merges, so panel
  // props the caller already set (items, hint text, etc.) are preserved.
  const sizedPanel = React.cloneElement(panel, { capWidth });

  const inner = (
    <box flexDirection="column" flexGrow={1} width={shellWidth}>
      <box flexDirection="column" flexGrow={1}>{scene}</box>
      <text>{status}</text>
      {sizedPanel}
    </box>
  );

  // Wide-terminal cap: when capping is active, center the inner column.
  if (shellWidth < width) {
    return (
      <box flexDirection="column" flexGrow={1} alignItems="center" width="100%">
        {inner}
      </box>
    );
  }
  return inner;
}
