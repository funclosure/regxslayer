export type DamageInput = {
  vitalsHit: number;
  vitalsTotal: number;
  collateral: number;
};

export function computeDamage({ vitalsHit, vitalsTotal, collateral }: DamageInput): number {
  if (vitalsTotal === 0) return 0;
  const base = (vitalsHit / vitalsTotal) * 100;
  const penalty = Math.max(0.2, 1 - 0.25 * collateral);
  return Math.round(base * penalty);
}

export type Symbolic = { glyph: string; label: string };

export function symbolicFor(damage: number): Symbolic {
  if (damage <= 0) return { glyph: "⚪", label: "no match" };
  if (damage < 50) return { glyph: "🔸", label: "partial" };
  if (damage < 100) return { glyph: "🔶", label: "close" };
  return { glyph: "🔥", label: "perfect" };
}
