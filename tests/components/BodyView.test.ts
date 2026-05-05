import { describe, expect, test } from "bun:test";
import { formatBodyRow } from "@/components/BodyView";

const base = {
  activeLayerIdx: 0,
  stripped: new Set<number>(),
  inHeart: false,
  matchedKeys: new Set<string>(),
};

describe("formatBodyRow — layer rows", () => {
  test("active vital line: ♦ gutter, plain text, not matched", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 0, text: "alpha", vital: true, ...base,
    });
    expect(r).toEqual({ gutter: "♦", prefix: "", text: "alpha", matched: false, matchKind: "vital" });
  });
  test("active filler line: blank gutter", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 1, text: "noise", vital: false, ...base,
    });
    expect(r).toEqual({ gutter: " ", prefix: "", text: "noise", matched: false, matchKind: "collateral" });
  });
  test("locked layer rows: ⛓ gutter, collateral if matched", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 1, lineIdx: 0, text: "gamma", vital: true, ...base,
    });
    expect(r).toEqual({ gutter: "⛓", prefix: "", text: "gamma", matched: false, matchKind: "collateral" });
  });
  test("stripped layer rows: [STRIPPED] prefix and blank gutter", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 0, text: "alpha", vital: true,
      ...base, stripped: new Set([0]), activeLayerIdx: 1,
    });
    expect(r).toEqual({ gutter: " ", prefix: "[STRIPPED] ", text: "alpha", matched: false, matchKind: "collateral" });
  });
  test("active vital line, matched: matched=true, matchKind=vital, text unchanged (no jitter brackets)", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 0, text: "alpha", vital: true,
      ...base, matchedKeys: new Set(["0:0"]),
    });
    expect(r.text).toBe("alpha");
    expect(r.matched).toBe(true);
    expect(r.matchKind).toBe("vital");
  });
  test("active filler line, matched: matchKind=collateral", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 1, text: "noise", vital: false,
      ...base, matchedKeys: new Set(["0:1"]),
    });
    expect(r.matched).toBe(true);
    expect(r.matchKind).toBe("collateral");
  });
  test("locked layer line, matched: matchKind=collateral", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 1, lineIdx: 0, text: "gamma", vital: true,
      ...base, matchedKeys: new Set(["1:0"]),
    });
    expect(r.matched).toBe(true);
    expect(r.matchKind).toBe("collateral");
  });
});

describe("formatBodyRow — heart row", () => {
  test("not in heart phase: blank gutter, collateral matchKind", () => {
    const r = formatBodyRow({
      kind: "heart", layerIdx: -1, lineIdx: -1, text: "HEART", vital: true, ...base,
    });
    expect(r).toEqual({ gutter: " ", prefix: "", text: "HEART", matched: false, matchKind: "collateral" });
  });
  test("in heart phase: ♦ gutter, vital matchKind", () => {
    const r = formatBodyRow({
      kind: "heart", layerIdx: -1, lineIdx: -1, text: "HEART", vital: true,
      ...base, inHeart: true,
    });
    expect(r).toEqual({ gutter: "♦", prefix: "", text: "HEART", matched: false, matchKind: "vital" });
  });
  test("matched heart in heart phase: text unchanged, matched=true, matchKind=vital", () => {
    const r = formatBodyRow({
      kind: "heart", layerIdx: -1, lineIdx: -1, text: "HEART", vital: true,
      ...base, inHeart: true, matchedKeys: new Set(["heart"]),
    });
    expect(r.text).toBe("HEART");
    expect(r.matched).toBe(true);
    expect(r.matchKind).toBe("vital");
  });
  test("matched heart during layer phase: matchKind=collateral (heart is locked)", () => {
    const r = formatBodyRow({
      kind: "heart", layerIdx: -1, lineIdx: -1, text: "HEART", vital: true,
      ...base, inHeart: false, matchedKeys: new Set(["heart"]),
    });
    expect(r.matched).toBe(true);
    expect(r.matchKind).toBe("collateral");
  });
});
