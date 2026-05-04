/**
 * The single controlled vocabulary of regex features the game can grade
 * the player on. Used by:
 *   - Layer.traits / Monster.traits in src/game/types.ts
 *   - SaveFile.traitStats keys
 *   - StatsScreen sorting and labelling
 *   - Validator (each layer.traits is a subset of monster.traits)
 *
 * Adding a new trait:
 *   1. Append to TRAITS (new traits go at the end to keep stable indices
 *      if anything ever serialises by position — currently nothing does,
 *      but the convention is cheap insurance).
 *   2. Update src/content/* to tag any existing layer that exercises it.
 *   3. Update the v2 spec's trait table.
 *
 * Removing a trait would break existing save files (trait keys would
 * persist in traitStats with no row in the StatsScreen). Don't remove
 * lightly; consider deprecation flags instead.
 */
export const TRAITS = [
  "LITERAL",
  "ALTERNATION",
  "GROUP",
  "ANCHOR_START",
  "ANCHOR_END",
  "CHAR_CLASS_DIGIT",
  "CHAR_CLASS_WORD",
  "CHAR_CLASS_SPACE",
  "CHAR_CLASS_SET",
  "CHAR_CLASS_RANGE",
  "QUANT_STAR",
  "QUANT_PLUS",
  "QUANT_OPTIONAL",
  "QUANT_EXACT",
  "ESCAPE",
] as const;

export type Trait = (typeof TRAITS)[number];

export const TRAIT_SET: ReadonlySet<Trait> = new Set(TRAITS);

export function isTrait(s: string): s is Trait {
  return (TRAIT_SET as ReadonlySet<string>).has(s);
}
