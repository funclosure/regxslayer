import type { Monster } from "./types";

/**
 * Pick the next encounter monster.
 *  - Uniform random over `pool`.
 *  - When pool.length >= 2, never returns a monster whose id equals `previousId` —
 *    rerolls until a different one comes up.
 *  - Pure given a deterministic `rng`.
 */
export function pickNext(pool: Monster[], previousId: string | null, rng: () => number = Math.random): Monster {
  if (pool.length === 0) {
    throw new Error("pickNext: empty pool");
  }
  if (pool.length === 1) {
    return pool[0]!;
  }
  // Cap retries defensively to avoid infinite loops on degenerate rng (e.g. rng always returns 0).
  for (let attempt = 0; attempt < 100; attempt++) {
    const idx = Math.floor(rng() * pool.length) % pool.length;
    const pick = pool[idx]!;
    if (pick.id !== previousId) return pick;
  }
  // Fallback: linear scan for any non-previousId monster (we know pool size >= 2).
  return pool.find((m) => m.id !== previousId) ?? pool[0]!;
}
