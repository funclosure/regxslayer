import { describe, expect, test } from "bun:test";
import { formatBodyRow, splitByRanges } from "@/components/BodyView";

const base = {
  activeLayerIdx: 0,
  stripped: new Set<number>(),
  inHeart: false,
  matchedKeys: new Set<string>(),
};

describe("formatBodyRow — layer rows", () => {
  test("active vital line: ♦ gutter, plain text, not matched, not stripped", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 0, text: "alpha", vital: true, ...base,
    });
    expect(r).toEqual({ gutter: "♦", text: "alpha", matched: false, matchKind: "vital", stripped: false });
  });
  test("active filler line: blank gutter", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 1, text: "noise", vital: false, ...base,
    });
    expect(r).toEqual({ gutter: " ", text: "noise", matched: false, matchKind: "collateral", stripped: false });
  });
  test("locked layer rows: ⛓ gutter, collateral if matched", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 1, lineIdx: 0, text: "gamma", vital: true, ...base,
    });
    expect(r).toEqual({ gutter: "⛓", text: "gamma", matched: false, matchKind: "collateral", stripped: false });
  });
  test("stripped layer rows: stripped flag set, · gutter marker (theme-safe)", () => {
    const r = formatBodyRow({
      kind: "layer", layerIdx: 0, lineIdx: 0, text: "alpha", vital: true,
      ...base, stripped: new Set([0]), activeLayerIdx: 1,
    });
    expect(r).toEqual({ gutter: "·", text: "alpha", matched: false, matchKind: "collateral", stripped: true });
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
    expect(r).toEqual({ gutter: " ", text: "HEART", matched: false, matchKind: "collateral", stripped: false });
  });
  test("in heart phase: ♦ gutter, vital matchKind", () => {
    const r = formatBodyRow({
      kind: "heart", layerIdx: -1, lineIdx: -1, text: "HEART", vital: true,
      ...base, inHeart: true,
    });
    expect(r).toEqual({ gutter: "♦", text: "HEART", matched: false, matchKind: "vital", stripped: false });
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

describe("splitByRanges", () => {
  test("empty ranges → single unmatched segment with the full text", () => {
    expect(splitByRanges("hello", [])).toEqual([{ text: "hello", matched: false }]);
  });
  test("one range covering the whole string → single matched segment", () => {
    expect(splitByRanges("alpha", [[0, 5]])).toEqual([{ text: "alpha", matched: true }]);
  });
  test("range in the middle → unmatched/matched/unmatched", () => {
    expect(splitByRanges("ab cd ef", [[3, 5]])).toEqual([
      { text: "ab ", matched: false },
      { text: "cd",  matched: true },
      { text: " ef", matched: false },
    ]);
  });
  test("multiple disjoint ranges", () => {
    expect(splitByRanges("ab cd ab", [[0, 2], [6, 8]])).toEqual([
      { text: "ab", matched: true },
      { text: " cd ", matched: false },
      { text: "ab", matched: true },
    ]);
  });
  test("overlapping/touching ranges merge", () => {
    expect(splitByRanges("abcdef", [[0, 3], [2, 5]])).toEqual([
      { text: "abcde", matched: true },
      { text: "f", matched: false },
    ]);
  });
});
