// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildAzimuthalRing } from "../src/azimuthal-ring.js";
import { newRule } from "../src/utils.js";
import { findAll } from "../src/vnode.js";

describe("buildAzimuthalRing", () => {
  const rule = newRule(0, 1, 0.1, 0.5);

  it("creates the correct number of slider groups", () => {
    const tree = buildAzimuthalRing(6, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    });

    const sliders = findAll(tree, (n) => "data-slider" in n.attrs);
    expect(sliders.length).toBe(6);
  });

  it("assigns correct data-slider attributes", () => {
    const tree = buildAzimuthalRing(3, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    });

    const ids = findAll(tree, (n) => "data-slider" in n.attrs).map(
      (n) => n.attrs["data-slider"],
    );
    expect(ids).toEqual(["A0", "A1", "A2"]);
  });

  it("uses correct layer letter for different layer indices", () => {
    const tree = buildAzimuthalRing(2, rule, {
      radius: 400,
      layerIndex: 3,
      ringWidth: 10,
    });

    const ids = findAll(tree, (n) => "data-slider" in n.attrs).map(
      (n) => n.attrs["data-slider"],
    );
    expect(ids).toEqual(["C0", "C1"]);
  });

  it("marks sliders as azimuthal type", () => {
    const tree = buildAzimuthalRing(2, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    });

    const slider = findAll(tree, (n) => "data-slider" in n.attrs)[0];
    expect(slider.attrs["data-slider-type"]).toBe("azimuthal");
  });

  it("creates circle sliders for each slider", () => {
    const tree = buildAzimuthalRing(4, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    });

    const circles = findAll(
      tree,
      (n) => n.tag === "circle" && (n.attrs["class"] ?? "").includes("slider"),
    );
    expect(circles.length).toBe(4);
  });

  it("creates tick marks for rule values", () => {
    const tree = buildAzimuthalRing(2, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    });

    const lines = findAll(tree, (n) => n.tag === "line");
    expect(lines.length).toBe(rule.length * 2);
  });

  it("creates index labels", () => {
    const tree = buildAzimuthalRing(3, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    });

    const labels = findAll(
      tree,
      (n) => n.tag === "text" && (n.attrs["class"] ?? "").includes("indices"),
    ).map((n) => n.text);
    expect(labels).toContain("A0");
    expect(labels).toContain("A1");
    expect(labels).toContain("A2");
  });

  it("sets style transform on slider groups", () => {
    const tree = buildAzimuthalRing(2, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    });

    const sliders = findAll(tree, (n) => "data-slider" in n.attrs);
    for (const slider of sliders) {
      expect(slider.attrs["style"]).toMatch(/transform: rotate\(/);
    }
  });

  it("has data-ring-type attribute on root", () => {
    const tree = buildAzimuthalRing(2, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    });

    expect(tree.attrs["data-ring-type"]).toBe("azimuthal");
  });
});
