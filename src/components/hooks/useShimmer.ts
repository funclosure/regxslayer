import { useEffect, useState } from "react";

const TICK_MS = 33;        // ~30 fps
const TAIL_FADE_MS = 250;  // soft fade-out at the end of the banner

/**
 * Drives a shimmer "spotlight" position from off-screen-left to off-screen-right
 * over `totalMs`, plus a tail fade-out in the final {@link TAIL_FADE_MS}.
 *
 * @param totalMs   how long the banner lives, total
 * @param textLength character count of the headline being shimmered
 * @param spotWidth half-width of the spotlight, in characters
 *
 * Returns:
 *   - `pos`: spotlight character index (can be negative or exceed length)
 *   - `opacity`: 0..1 for the outer container; ramps down at the very end
 *
 * Cancels its timer on unmount.
 */
export function useShimmer(
  totalMs: number,
  textLength: number,
  spotWidth: number,
): { pos: number; opacity: number } {
  const [t, setT] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let cancelled = false;
    let handle: ReturnType<typeof setTimeout> | null = null;
    const tick = (): void => {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      setT(elapsed);
      if (elapsed < totalMs) handle = setTimeout(tick, TICK_MS);
    };
    handle = setTimeout(tick, TICK_MS);
    return () => {
      cancelled = true;
      if (handle !== null) clearTimeout(handle);
    };
  }, [totalMs]);

  const sweepStart = -spotWidth;
  const sweepEnd = textLength + spotWidth;
  const progress = Math.min(1, t / Math.max(1, totalMs - TAIL_FADE_MS));
  const pos = sweepStart + (sweepEnd - sweepStart) * progress;
  const opacity = t > totalMs - TAIL_FADE_MS
    ? Math.max(0, (totalMs - t) / TAIL_FADE_MS)
    : 1;
  return { pos, opacity };
}
