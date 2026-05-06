import React from "react";

export type RegexInputProps = {
  value: string;
  onChange: (next: string) => void;
  invalid?: string | undefined;
};

export function RegexInput({ value, onChange, invalid }: RegexInputProps): React.ReactElement {
  // gridland's <input> renders the value itself (with cursor). Keep the row
  // structure but force the input to width=100% within its parent — flexGrow
  // alone wasn't taking effect (the input still collapsed to ~3 cells and
  // ate leading characters as you typed past the visible width).
  return (
    <box flexDirection="column" width="100%" flexShrink={0}>
      <box flexDirection="row" gap={1} width="100%">
        <text>▶</text>
        <box flexGrow={1}>
          {React.createElement("input", {
            value,
            focused: true,
            onInput: onChange,
            maxLength: 256,
            width: "100%",
          })}
        </box>
      </box>
      {invalid ? <text>⚠ {invalid}</text> : null}
    </box>
  );
}
