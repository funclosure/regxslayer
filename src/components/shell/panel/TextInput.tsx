import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { InputPanel, PanelRow, panelTextRow } from "@/components/shell/InputPanel";
import { computeShellWidth } from "@/components/shell/Shell";
import { FeedbackLine } from "@/components/FeedbackLine";
import { HeartSparks } from "@/components/HeartSparks";

export type TextInputProps = {
  pattern: string;
  onPatternChange: (next: string) => void;
  vitalsHit: number;
  vitalsTotal: number;
  collateral: number;
  damage: number;
  invalid?: string;
  hints: string;
  capWidth?: boolean;
  /** Pass `true` during heart phase to enable per-keystroke spark effects. */
  sparksActive?: boolean;
  /** Used by HeartSparks to detect keystroke trigger points. */
  sparksTrigger?: number;
};

/** `text` panel mode: regex input row + feedback rows + optional invalid + optional sparks.
 *  Used by CombatScreen during the typing/heart phase. */
export function TextInput(props: TextInputProps): React.ReactElement {
  const { width: termWidth } = useTerminalDimensions();
  const width = computeShellWidth(termWidth, props.capWidth ?? false);

  // Input row: render side borders inline so the gridland <input> sits directly
  // inside a single flex row with `flexGrow={1}`. Wrapping it in a nested
  // <PanelRow> + inner flex row caused the input to collapse and become
  // visually empty (the value was captured but nothing rendered).
  const inputRow = (
    <box flexDirection="row" width={width}>
      <text>│ › </text>
      <box flexGrow={1}>
        {React.createElement("input", {
          value: props.pattern,
          focused: true,
          onInput: props.onPatternChange,
          maxLength: 256,
          width: "100%",
        })}
      </box>
      <text> │</text>
    </box>
  );

  return (
    <InputPanel width={width} hints={props.hints}>
      {inputRow}
      {props.invalid ? <text>{panelTextRow(width, "  ⚠ " + props.invalid)}</text> : null}
      <PanelRow width={width}>
        <FeedbackLine
          vitalsHit={props.vitalsHit}
          vitalsTotal={props.vitalsTotal}
          collateral={props.collateral}
          damage={props.damage}
        />
      </PanelRow>
      {props.sparksActive && props.sparksTrigger !== undefined ? (
        <PanelRow width={width}>
          <HeartSparks trigger={props.sparksTrigger} active={props.sparksActive} />
        </PanelRow>
      ) : null}
    </InputPanel>
  );
}
