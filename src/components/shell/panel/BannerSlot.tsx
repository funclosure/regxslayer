import React from "react";
import { useTerminalDimensions } from "@gridland/utils";
import { InputPanel, PanelRow } from "@/components/shell/InputPanel";
import { computeShellWidth } from "@/components/shell/Shell";
import { ShimmerBanner } from "@/components/ShimmerBanner";

export type BannerSlotProps = {
  headline: string;
  peakColor: string;
  durationMs: number;
  footnoteLabel: string;
  footnoteValue: string;
  capWidth?: boolean;
};

/** `banner` panel mode: hosts the existing ShimmerBanner inside the bordered panel.
 *  Used by CombatScreen during strip / kill phases. */
export function BannerSlot(props: BannerSlotProps): React.ReactElement {
  const { width: termWidth } = useTerminalDimensions();
  const width = computeShellWidth(termWidth, props.capWidth ?? false);
  return (
    <InputPanel width={width}>
      <PanelRow width={width}>
        <ShimmerBanner
          headline={props.headline}
          peakColor={props.peakColor}
          durationMs={props.durationMs}
          footnoteLabel={props.footnoteLabel}
          footnoteValue={props.footnoteValue}
        />
      </PanelRow>
    </InputPanel>
  );
}
