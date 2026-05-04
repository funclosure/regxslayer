import { describe, expect, test } from "bun:test";
import { chapters } from "@/content/chapters";
import { validateChapter } from "@/../scripts/validate-content";

describe("chapter content", () => {
  for (const ch of chapters) {
    test(`chapter "${ch.id}" passes validation`, () => {
      expect(validateChapter(ch)).toEqual([]);
    });
  }
});
