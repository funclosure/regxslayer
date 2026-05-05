import React from "react";

export type HintOverlayProps = {
  title: string;
  lines: string[];
};

export function HintOverlay({ title, lines }: HintOverlayProps): React.ReactElement {
  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      padding={1}
      gap={1}
    >
      <text>HINT — {title}</text>
      {lines.map((l, i) => (
        <text key={i}>{l}</text>
      ))}
      <text>[F1] or [esc] to close</text>
    </box>
  );
}
