import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { ATTR_DIM } from "@/components/style";
import { InputPanel, panelTextRow } from "@/components/shell/InputPanel";
import { computeShellWidth } from "@/components/shell/Shell";

export type PromptProps = {
  /** Single-line hint text, e.g. "[r] reset · [esc] back". */
  hint: string;
  /** Inherit the shell's cap policy. Combat passes false. Default true. */
  capWidth?: boolean;
};

/** `prompt` panel mode: bordered box with a single dim hint row. No header, no footer rule. */
export function Prompt({ hint, capWidth = true }: PromptProps): React.ReactElement {
  const { width: termWidth } = useTerminalDimensions();
  const width = computeShellWidth(termWidth, capWidth);
  const row = panelTextRow(width, "  " + hint);
  return (
    <InputPanel width={width}>
      {React.createElement("text", null,
        React.createElement("span", { style: { attributes: ATTR_DIM } }, row),
      )}
    </InputPanel>
  );
}
