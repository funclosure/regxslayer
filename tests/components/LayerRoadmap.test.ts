import { describe, expect, test } from "bun:test";
import { formatRoadmapRow } from "@/components/LayerRoadmap";

const topics = ["literals", "char class", "quantifiers"];

describe("formatRoadmapRow", () => {
  test("stripped layer renders ● + ✓", () => {
    const r = formatRoadmapRow(0, topics, 1, new Set([0]), false);
    expect(r).toEqual({ dot: "●", label: "literals", tail: " ✓" });
  });
  test("active layer renders ● + ▲", () => {
    const r = formatRoadmapRow(1, topics, 1, new Set([0]), false);
    expect(r).toEqual({ dot: "●", label: "char class", tail: " ▲" });
  });
  test("locked layer renders ○ with no tail", () => {
    const r = formatRoadmapRow(2, topics, 1, new Set([0]), false);
    expect(r).toEqual({ dot: "○", label: "quantifiers", tail: "" });
  });
  test("heart row inactive when not in heart phase", () => {
    const r = formatRoadmapRow(3, topics, 1, new Set([0]), false);
    expect(r).toEqual({ dot: "○", label: "heart", tail: "" });
  });
  test("heart row active in heart phase", () => {
    const r = formatRoadmapRow(3, topics, 2, new Set([0, 1, 2]), true);
    expect(r).toEqual({ dot: "▲", label: "heart", tail: "" });
  });
});
