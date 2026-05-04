import React from "react";

export type RegexInputProps = {
  value: string;
  onChange: (next: string) => void;
  invalid?: string | undefined;
};

export function RegexInput({ value, onChange, invalid }: RegexInputProps): React.ReactElement {
  // gridland's <input> renders the value itself (with cursor). The leading
  // "▶" marker is a separate static element; we must NOT also render the
  // value as static text or it doubles up visually. The input also needs
  // flexGrow so it takes the row's remaining width — without it the input
  // collapses to ~1 cell and scrolls horizontally, eating leading characters.
  return (
    <box flexDirection="row" gap={1} width="100%">
      <text>▶</text>
      {React.createElement("input", {
        value,
        focused: true,
        onInput: onChange,
        maxLength: 256,
        flexGrow: 1,
      })}
      {invalid ? <text>⚠ {invalid}</text> : null}
    </box>
  );
}
