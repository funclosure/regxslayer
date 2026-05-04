import { describe, expect, test } from "bun:test";
import { navigateMenu } from "@/screens/MenuScreen";

describe("navigateMenu", () => {
  test("down advances", () => {
    expect(navigateMenu(3, 0, "down")).toBe(1);
    expect(navigateMenu(3, 1, "down")).toBe(2);
  });
  test("down wraps from last to first", () => {
    expect(navigateMenu(3, 2, "down")).toBe(0);
  });
  test("up retreats", () => {
    expect(navigateMenu(3, 2, "up")).toBe(1);
    expect(navigateMenu(3, 1, "up")).toBe(0);
  });
  test("up wraps from first to last", () => {
    expect(navigateMenu(3, 0, "up")).toBe(2);
  });
  test("zero items returns 0", () => {
    expect(navigateMenu(0, 0, "down")).toBe(0);
  });
});
