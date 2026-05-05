import React from "react";
import { useShimmer } from "@/components/hooks/useShimmer";
import { ATTR_BOLD, SHIMMER_BASE_COLOR, blendHex } from "@/components/style";

/** How many characters on each side of the spotlight center fall under the gradient. */
const SPOT_WIDTH = 6;

export type ShimmerBannerProps = {
  /** The shimmering headline. Each character animates independently. */
  headline: string;
  /** Peak (full-spotlight) color of the headline. Trough is {@link SHIMMER_BASE_COLOR}. */
  peakColor: string;
  /** How long the banner lives, including its tail-fade. */
  durationMs: number;
  /** Plain-text label below the headline (e.g. "killed by:" or "matched by:"). */
  footnoteLabel: string;
  /** The regex pattern that earned the banner. */
  footnoteValue: string;
};

/**
 * Reusable banner with a left-to-right shimmer "spotlight" sweeping over the headline.
 * Used by both the per-layer STRIPPED banner and the heart-kill SLAIN banner.
 *
 * Each character is rendered as its own `<span>`; the spotlight position advances
 * over time and per-character fg colors are linearly interpolated between
 * {@link SHIMMER_BASE_COLOR} and `peakColor` based on distance from the spotlight.
 */
export function ShimmerBanner(props: ShimmerBannerProps): React.ReactElement {
  const { headline, peakColor, durationMs, footnoteLabel, footnoteValue } = props;
  const { pos, opacity } = useShimmer(durationMs, headline.length, SPOT_WIDTH);

  const headlineSpans = Array.from(headline).map((ch, i) => {
    const distance = Math.abs(i - pos);
    // Short-circuit far chars to skip the blendHex math (most chars are far from the spotlight).
    const intensity = distance >= SPOT_WIDTH ? 0 : 1 - distance / SPOT_WIDTH;
    const fg = intensity === 0 ? SHIMMER_BASE_COLOR : blendHex(SHIMMER_BASE_COLOR, peakColor, intensity);
    return React.createElement(
      "span",
      { key: i, style: { fg, attributes: ATTR_BOLD } },
      ch,
    );
  });

  return (
    <box flexDirection="column" gap={1} padding={1} opacity={opacity}>
      <text>{headlineSpans}</text>
      <text>{footnoteLabel}  {footnoteValue}</text>
    </box>
  );
}
