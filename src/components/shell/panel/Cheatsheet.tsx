import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { InputPanel, panelTextRow } from "@/components/shell/InputPanel";
import { computeShellWidth } from "@/components/shell/Shell";

export type CheatsheetProps = {
  /** Chapter title — appears in the panel header as "<title> · cheatsheet". */
  chapterTitle: string;
  /** Cheatsheet rows from the chapter content. */
  lines: ReadonlyArray<string>;
  /** Footer hint, e.g. "[tab] back to combat". */
  hints: string;
  capWidth?: boolean;
};

/** `cheatsheet` panel mode: displays chapter regex hints. Toggle in/out via tab. */
export function Cheatsheet(props: CheatsheetProps): React.ReactElement {
  const { width: termWidth } = useTerminalDimensions();
  const width = computeShellWidth(termWidth, props.capWidth ?? false);
  return (
    <InputPanel
      width={width}
      header={`${props.chapterTitle} · cheatsheet`}
      hints={props.hints}
    >
      {props.lines.map((line, i) => (
        <text key={`cheat:${i}`}>{panelTextRow(width, "  " + line)}</text>
      ))}
    </InputPanel>
  );
}
