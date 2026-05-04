import { describe, expect, test } from "bun:test";
import { formatBodyRow } from "@/components/BodyView";

const base = {
  activeLayerIdx: 0,
  stripped: new Set<number>(),
  inHeart: false,
  matchedKeys: new Set<string>(),
};

describe("formatBodyRow — layer rows", () => {
  test("active vital line gets ♦ gutter, plain text", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 0, text: "alpha", vital: true, ...base,
    });
    expect(r).toEqual({ gutter: "♦", prefix: "", display: "alpha" });
  });
  test("active filler line gets blank gutter", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 1, text: "noise", vital: false, ...base,
    });
    expect(r).toEqual({ gutter: " ", prefix: "", display: "noise" });
  });
  test("locked layer rows get ⛓ gutter", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 1, lineIdx: 0, text: "gamma", vital: true, ...base,
    });
    expect(r).toEqual({ gutter: "⛓", prefix: "", display: "gamma" });
  });
  test("stripped layer rows get [STRIPPED] prefix and blank gutter", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 0, text: "alpha", vital: true,
      ...base, stripped: new Set([0]), activeLayerIdx: 1,
    });
    expect(r).toEqual({ gutter: " ", prefix: "[STRIPPED] ", display: "alpha" });
  });
  test("matched line wraps in › ‹ brackets", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 0, text: "alpha", vital: true,
      ...base, matchedKeys: new Set(["0:0"]),
    });
    expect(r.display).toBe("›alpha‹");
  });
});

describe("formatBodyRow — heart row", () => {
  test("not in heart phase: blank gutter, plain text", () => {
    const r = formatBodyRow({
      kind: "heart", layerIdx: -1, lineIdx: -1, text: "HEART", vital: true, ...base,
    });
    expect(r).toEqual({ gutter: " ", prefix: "", display: "HEART" });
  });
  test("in heart phase: ♦ gutter", () => {
    const r = formatBodyRow({
      kind: "heart", layerIdx: -1, lineIdx: -1, text: "HEART", vital: true,
      ...base, inHeart: true,
    });
    expect(r).toEqual({ gutter: "♦", prefix: "", display: "HEART" });
  });
  test("matched heart wraps in › ‹", () => {
    const r = formatBodyRow({
      kind: "heart", layerIdx: -1, lineIdx: -1, text: "HEART", vital: true,
      ...base, inHeart: true, matchedKeys: new Set(["heart"]),
    });
    expect(r.display).toBe("›HEART‹");
  });
});
