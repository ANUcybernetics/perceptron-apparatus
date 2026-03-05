import { describe, it, expect } from "vitest";
import { deg2rad, newRule, formatNumber } from "../src/utils.js";

describe("deg2rad", () => {
  it("converts 0 degrees to 0 radians", () => {
    expect(deg2rad(0)).toBe(0);
  });

  it("converts 180 degrees to pi radians", () => {
    expect(deg2rad(180)).toBeCloseTo(Math.PI);
  });

  it("converts 360 degrees to 2*pi radians", () => {
    expect(deg2rad(360)).toBeCloseTo(2 * Math.PI);
  });

  it("converts 90 degrees to pi/2 radians", () => {
    expect(deg2rad(90)).toBeCloseTo(Math.PI / 2);
  });

  it("handles negative degrees", () => {
    expect(deg2rad(-90)).toBeCloseTo(-Math.PI / 2);
  });
});

describe("formatNumber", () => {
  it("formats integers without trailing decimals", () => {
    expect(formatNumber(5)).toBe("5");
  });

  it("formats decimals correctly", () => {
    expect(formatNumber(1.5)).toBe("1.5");
  });

  it("formats negative zero as zero", () => {
    expect(formatNumber(-0)).toBe("0");
  });

  it("formats negative numbers", () => {
    expect(formatNumber(-3)).toBe("-3");
  });
});

describe("newRule", () => {
  it("creates a rule with correct number of ticks", () => {
    const rule = newRule(0, 1, 0.1, 0.5);
    expect(rule.length).toBe(11);
  });

  it("labels ticks at major step intervals", () => {
    const rule = newRule(0, 1, 0.1, 0.5);
    expect(rule[0].label).toBe("0");
    expect(rule[5].label).toBe("0.5");
    expect(rule[10].label).toBe("1");
  });

  it("has null labels for minor ticks", () => {
    const rule = newRule(0, 1, 0.1, 0.5);
    expect(rule[1].label).toBeNull();
    expect(rule[3].label).toBeNull();
  });

  it("has correct values for all ticks", () => {
    const rule = newRule(0, 5, 1, 5);
    expect(rule.map((t) => t.value)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("labels only at major step for sparse rules", () => {
    const rule = newRule(-5, 5, 1, 5);
    const labelled = rule.filter((t) => t.label != null);
    expect(labelled.map((t) => t.value)).toEqual([-5, 0, 5]);
  });
});
