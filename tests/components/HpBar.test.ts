import { describe, expect, test } from "bun:test";
import { formatHpBar } from "@/components/HpBar";

describe("formatHpBar", () => {
  test("100% renders fully filled bar", () => {
    const out = formatHpBar(100, 100);
    expect(out).toContain("100/100");
    expect(out).toContain("█".repeat(10));
    expect(out).not.toContain("░");
  });
  test("0% renders empty bar", () => {
    const out = formatHpBar(0, 100);
    expect(out).toContain("0/100");
    expect(out).toContain("░".repeat(10));
    expect(out).not.toContain("█");
  });
  test("50% renders half bar", () => {
    const out = formatHpBar(50, 100);
    expect(out).toContain("50/100");
    expect(out).toContain("█".repeat(5));
    expect(out).toContain("░".repeat(5));
  });
  test("clamps negative percent to 0", () => {
    const out = formatHpBar(-10, 100);
    expect(out).toContain("░".repeat(10));
  });
  test("clamps percent over 100 to 100", () => {
    const out = formatHpBar(150, 100);
    expect(out).toContain("█".repeat(10));
  });
});
