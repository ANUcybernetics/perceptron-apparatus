import { describe, it, expect } from "vitest";
import { deg2rad, newRule, formatNumber, weightRule, weightScaleFraction } from "../src/utils.js";

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

describe("weightRule on the log scale", () => {
  it("runs from zero to the maximum with a tick at every leading digit", () => {
    const values = weightRule("log").map((t) => t.value);
    expect(values[0]).toBe(0);
    expect(values[1]).toBe(0.02);
    expect(values[values.length - 1]).toBe(5);
    expect(values).toContain(0.07);
    expect(values).toContain(0.3);
    expect(values).toContain(4);
    expect(values).not.toContain(6);
  });
});

describe("weightScaleFraction on the log scale", () => {
  it("puts zero at one end and the maximum at the other", () => {
    expect(weightScaleFraction(0, "log")).toBe(0);
    expect(weightScaleFraction(5, "log")).toBeCloseTo(1);
  });

  it("ignores sign", () => {
    expect(weightScaleFraction(-0.3, "log")).toBe(weightScaleFraction(0.3, "log"));
  });

  it("leaves a gap between zero and the smallest marked magnitude", () => {
    expect(weightScaleFraction(0.02, "log")).toBeGreaterThan(0);
    expect(weightScaleFraction(0.019, "log")).toBe(0);
  });

  it("clamps magnitudes beyond the maximum", () => {
    expect(weightScaleFraction(50, "log")).toBeCloseTo(1);
  });

  it("is logarithmic above the minimum", () => {
    const ratio = (a: number, b: number) =>
      weightScaleFraction(b, "log") - weightScaleFraction(a, "log");
    expect(ratio(0.02, 0.2)).toBeCloseTo(ratio(0.5, 5));
  });
});

describe("the linear weight scale", () => {
  it("is the default", () => {
    expect(weightRule()).toEqual(weightRule("linear"));
    expect(weightScaleFraction(2.5)).toBe(weightScaleFraction(2.5, "linear"));
  });

  it("runs from -5 to 5 with a tick at every whole number", () => {
    const rule = weightRule("linear");
    expect(rule.map((t) => t.value)).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
    expect(rule.filter((t) => t.label != null).map((t) => t.label)).toEqual(["-5", "0", "5"]);
  });

  it("puts -5 at the outer end of the slot, zero in the middle and 5 at the inner end", () => {
    expect(weightScaleFraction(-5, "linear")).toBe(0);
    expect(weightScaleFraction(0, "linear")).toBe(0.5);
    expect(weightScaleFraction(5, "linear")).toBe(1);
    expect(weightScaleFraction(-50, "linear")).toBe(0);
  });
});
