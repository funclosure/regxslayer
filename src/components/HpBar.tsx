import React from "react";

export type HpBarProps = {
  percent: number;   // 0..100
  max: number;
};

/** Pure formatter — exported so it can be unit-tested without rendering. */
export function formatHpBar(percent: number, max: number): string {
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * 10);
  const empty = 10 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const value = Math.round((percent / 100) * max);
  return `HP ${bar} ${value}/${max}`;
}

export function HpBar({ percent, max }: HpBarProps): React.ReactElement {
  return <text>{formatHpBar(percent, max)}</text>;
}
