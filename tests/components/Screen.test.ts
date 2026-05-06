import { describe, expect, test } from "bun:test";
import { DEFAULT_SCREEN_WIDTH } from "@/components/Screen";

describe("DEFAULT_SCREEN_WIDTH", () => {
  test("is 64 characters", () => {
    expect(DEFAULT_SCREEN_WIDTH).toBe(64);
  });
});
