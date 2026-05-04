import React from "react";

export type RegexInputProps = {
  value: string;
  onChange: (next: string) => void;
  invalid?: string | undefined;
};

export function RegexInput({ value, onChange, invalid }: RegexInputProps): React.ReactElement {
  return (
    <box flexDirection="row" gap={1}>
      <text>▶ {value}</text>
      {/* gridland's <input> onInput receives the string value directly, not a DOM event;
          cast to any because @types/react types this as a standard HTML element */}
      {React.createElement("input", { value, focused: true, onInput: onChange, maxLength: 256 })}
      {invalid ? <text>⚠ {invalid}</text> : null}
    </box>
  );
}
