// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildRadialRing } from "../src/radial-ring.js";
import { newRule } from "../src/utils.js";
import { findAll } from "../src/vnode.js";

describe("buildRadialRing", () => {
  const rule = newRule(-5, 5, 1, 5);

  it("creates the correct total number of sliders", () => {
    const tree = buildRadialRing(3, 4, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    });

    const sliders = findAll(tree, (n) => "data-slider" in n.attrs);
    expect(sliders.length).toBe(12);
  });

  it("assigns correct data-slider attributes", () => {
    const tree = buildRadialRing(2, 3, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    });

    const ids = findAll(tree, (n) => "data-slider" in n.attrs).map(
      (n) => n.attrs["data-slider"],
    );
    expect(ids).toContain("B0-0");
    expect(ids).toContain("B0-1");
    expect(ids).toContain("B0-2");
    expect(ids).toContain("B1-0");
    expect(ids).toContain("B1-1");
    expect(ids).toContain("B1-2");
  });

  it("marks sliders as radial type", () => {
    const tree = buildRadialRing(2, 2, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    });

    const slider = findAll(tree, (n) => "data-slider" in n.attrs)[0];
    expect(slider.attrs["data-slider-type"]).toBe("radial");
  });

  it("creates guide arcs", () => {
    const tree = buildRadialRing(2, 2, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    });

    const paths = findAll(
      tree,
      (n) => n.tag === "path" && (n.attrs["class"] ?? "").includes("etch"),
    );
    expect(paths.length).toBeGreaterThan(0);
  });

  it("creates group index labels", () => {
    const tree = buildRadialRing(3, 2, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    });

    const labels = findAll(
      tree,
      (n) => n.tag === "text" && (n.attrs["class"] ?? "").includes("indices"),
    ).map((n) => n.text);
    expect(labels).toContain("B0");
    expect(labels).toContain("B1");
    expect(labels).toContain("B2");
  });

  it("creates slider circles with correct class", () => {
    const tree = buildRadialRing(2, 3, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    });

    const circles = findAll(
      tree,
      (n) =>
        n.tag === "circle" &&
        (n.attrs["class"] ?? "").includes("top") &&
        (n.attrs["class"] ?? "").includes("slider"),
    );
    expect(circles.length).toBe(6);
  });

  it("has data-ring-type attribute on root", () => {
    const tree = buildRadialRing(2, 2, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    });

    expect(tree.attrs["data-ring-type"]).toBe("radial");
  });
});
