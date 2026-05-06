import { describe, expect, test } from "bun:test";
import { screenOuterBoxProps, DEFAULT_SCREEN_WIDTH } from "@/components/Screen";

describe("screenOuterBoxProps", () => {
  test("default props omit justifyContent", () => {
    expect(screenOuterBoxProps(false)).toEqual({
      flexDirection: "column",
      flexGrow: 1,
      padding: 2,
      alignItems: "center",
    });
  });

  test("centerVertically=true adds justifyContent", () => {
    expect(screenOuterBoxProps(true)).toEqual({
      flexDirection: "column",
      flexGrow: 1,
      padding: 2,
      alignItems: "center",
      justifyContent: "center",
    });
  });
});

describe("DEFAULT_SCREEN_WIDTH", () => {
  test("is 64 characters", () => {
    expect(DEFAULT_SCREEN_WIDTH).toBe(64);
  });
});
