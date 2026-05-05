import React, { useEffect, useRef, useState } from "react";
import { ATTR_BOLD, DANGER_COLOR, blendHex } from "@/components/style";

const SPARK_LIFE_MS = 700;
const SPARK_GLYPHS = ["✦", "✧", "✸", "⚡", "✩", "✺", "❖"];
const MAX_SPARKS = 12;
const FADED_COLOR = "#3a3a3a";

type Spark = {
  id: number;
  ch: string;
  born: number;
};

let sparkSeq = 0;

export type HeartSparksProps = {
  /** Trigger value — every time it grows, a new spark spawns. Typically a key/length. */
  trigger: number;
  /** Whether sparks should be active. When false, sparks clear immediately. */
  active: boolean;
};

/**
 * Per-keystroke spark effects shown during the heart phase. Each new spark
 * starts at full brightness and fades to FADED_COLOR over SPARK_LIFE_MS.
 *
 * Spawns one spark whenever `trigger` increases (typically tied to the
 * current pattern length, so additions spawn but backspaces don't). Removes
 * sparks older than SPARK_LIFE_MS via a 100ms reaper.
 */
export function HeartSparks({ trigger, active }: HeartSparksProps): React.ReactElement | null {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const lastTrigger = useRef(trigger);
  const [now, setNow] = useState(() => performance.now());

  // Spawn on trigger increase.
  useEffect(() => {
    if (!active) {
      setSparks([]);
      lastTrigger.current = trigger;
      return;
    }
    if (trigger > lastTrigger.current) {
      const ch = SPARK_GLYPHS[Math.floor(Math.random() * SPARK_GLYPHS.length)] ?? "✦";
      const spark: Spark = { id: ++sparkSeq, ch, born: performance.now() };
      setSparks((s) => [...s.slice(-(MAX_SPARKS - 1)), spark]);
    }
    lastTrigger.current = trigger;
  }, [trigger, active]);

  // Reaper: remove sparks older than SPARK_LIFE_MS.
  useEffect(() => {
    if (!active) return;
    const handle = setInterval(() => {
      const t = performance.now();
      setNow(t);
      setSparks((s) => s.filter((sp) => t - sp.born < SPARK_LIFE_MS));
    }, 100);
    return () => clearInterval(handle);
  }, [active]);

  if (!active || sparks.length === 0) return null;

  const children = sparks.map((sp) => {
    const age = Math.min(1, (now - sp.born) / SPARK_LIFE_MS);
    const fg = blendHex(DANGER_COLOR, FADED_COLOR, age);
    return React.createElement(
      "span",
      { key: sp.id, style: { fg, attributes: ATTR_BOLD } },
      sp.ch + " ",
    );
  });
  return <text>{children}</text>;
}
