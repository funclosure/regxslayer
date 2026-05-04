import { describe, expect, test } from "bun:test";
import { TRAITS, type Trait } from "@/game/traits";

describe("TRAITS", () => {
  test("contains 15 entries", () => {
    expect(TRAITS.length).toBe(15);
  });
  test("has no duplicates", () => {
    expect(new Set(TRAITS).size).toBe(TRAITS.length);
  });
  test("includes the documented trait names", () => {
    const expected = new Set<Trait>([
      "LITERAL", "ALTERNATION", "GROUP",
      "ANCHOR_START", "ANCHOR_END",
      "CHAR_CLASS_DIGIT", "CHAR_CLASS_WORD", "CHAR_CLASS_SPACE",
      "CHAR_CLASS_SET", "CHAR_CLASS_RANGE",
      "QUANT_STAR", "QUANT_PLUS", "QUANT_OPTIONAL", "QUANT_EXACT",
      "ESCAPE",
    ]);
    expect(new Set(TRAITS)).toEqual(expected);
  });
  test("Trait type is a string-literal union (typecheck guard)", () => {
    const x: Trait = "LITERAL";
    expect(x).toBe("LITERAL");
  });
});
