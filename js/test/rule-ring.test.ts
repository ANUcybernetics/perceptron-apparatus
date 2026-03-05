import { describe, it, expect } from "vitest";
import { logRule, reluRule, renderRuleRing } from "../src/rule-ring.js";

describe("logRule", () => {
  it("generates ticks from 1.0 to 9.9", () => {
    const rule = logRule();
    expect(rule.length).toBe(90);
    expect(rule[0].outerLabel).toBe("1");
    expect(rule[rule.length - 1].outerLabel).toBeNull();
  });

  it("has theta 0 for value 1.0", () => {
    const rule = logRule();
    expect(rule[0].theta).toBeCloseTo(0);
  });

  it("has theta 360 for value 10.0 (extrapolated, last tick is 9.9)", () => {
    const rule = logRule();
    const last = rule[rule.length - 1];
    expect(last.theta).toBeLessThan(360);
    expect(last.theta).toBeGreaterThan(350);
  });

  it("labels all ticks below 2.0", () => {
    const rule = logRule();
    const belowTwo = rule.filter(
      (t) => t.theta < logRule().find((r) => r.outerLabel === "2")!.theta,
    );
    for (const tick of belowTwo) {
      expect(tick.outerLabel).not.toBeNull();
    }
  });

  it("labels even values between 2-5", () => {
    const rule = logRule();
    const tick2 = rule.find((t) => t.outerLabel === "2");
    const tick4 = rule.find((t) => t.outerLabel === "4");
    expect(tick2).toBeDefined();
    expect(tick4).toBeDefined();
  });

  it("labels multiples of 0.5 above 5", () => {
    const rule = logRule();
    const tick5 = rule.find((t) => t.outerLabel === "5");
    const tick55 = rule.find((t) => t.outerLabel === "5.5");
    expect(tick5).toBeDefined();
    expect(tick55).toBeDefined();
  });
});

describe("reluRule", () => {
  it("generates negative ticks excluding endpoints", () => {
    const rule = reluRule(5, 1);
    const positiveLabelled = rule.filter(
      (t) => t.outerLabel != null && parseFloat(t.outerLabel) > 0,
    );
    const negativeLabelled = rule.filter(
      (t) => t.outerLabel != null && parseFloat(t.outerLabel) < 0,
    );
    expect(positiveLabelled.length).toBe(5);
    expect(negativeLabelled.length).toBe(4);
  });

  it("has inner labels clamped to 0 for negative values (ReLU)", () => {
    const rule = reluRule(5, 1);
    const negatives = rule.filter(
      (t) => t.outerLabel != null && parseFloat(t.outerLabel) < 0,
    );
    for (const tick of negatives) {
      expect(tick.innerLabel).toBe("0");
    }
  });

  it("has theta 0 for value 0", () => {
    const rule = reluRule(5, 1);
    const zero = rule.find((t) => t.outerLabel === "0");
    expect(zero).toBeDefined();
    expect(zero!.theta).toBe(0);
  });
});

describe("renderRuleRing", () => {
  it("creates SVG elements for each tick", () => {
    const rule = logRule();
    const parent = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    const g = renderRuleRing(rule, { radius: 500, ringWidth: 30 }, parent);

    expect(g.tagName).toBe("g");
    const lines = g.querySelectorAll("line");
    expect(lines.length).toBe(rule.length);
  });

  it("creates a circle element for the ring edge", () => {
    const rule = logRule();
    const parent = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    const g = renderRuleRing(rule, { radius: 500, ringWidth: 30 }, parent);

    const circle = g.querySelector("circle");
    expect(circle).not.toBeNull();
    expect(circle!.getAttribute("class")).toBe("top full");
  });

  it("positions tick marks at correct radius", () => {
    const rule = logRule();
    const parent = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    const g = renderRuleRing(rule, { radius: 500, ringWidth: 30 }, parent);

    const circle = g.querySelector("circle");
    const expectedRadius = 500 - 30 / 2;
    expect(circle!.getAttribute("r")).toBe(String(expectedRadius));
  });
});
