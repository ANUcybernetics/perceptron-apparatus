import { describe, it, expect } from "vitest";
import { renderRadialRing } from "../src/radial-ring.js";
import { newRule } from "../src/utils.js";

function makeSvg(): SVGSVGElement {
  return document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
}

describe("renderRadialRing", () => {
  const rule = newRule(-5, 5, 1, 5);

  it("creates the correct total number of sliders", () => {
    const svg = makeSvg();
    const g = renderRadialRing(3, 4, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    }, svg);

    const sliders = g.querySelectorAll("[data-slider]");
    expect(sliders.length).toBe(12);
  });

  it("assigns correct data-slider attributes", () => {
    const svg = makeSvg();
    const g = renderRadialRing(2, 3, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    }, svg);

    const ids = Array.from(g.querySelectorAll("[data-slider]")).map((el) =>
      el.getAttribute("data-slider"),
    );
    expect(ids).toContain("B0-0");
    expect(ids).toContain("B0-1");
    expect(ids).toContain("B0-2");
    expect(ids).toContain("B1-0");
    expect(ids).toContain("B1-1");
    expect(ids).toContain("B1-2");
  });

  it("marks sliders as radial type", () => {
    const svg = makeSvg();
    const g = renderRadialRing(2, 2, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    }, svg);

    const slider = g.querySelector("[data-slider]");
    expect(slider!.getAttribute("data-slider-type")).toBe("radial");
  });

  it("creates guide arcs", () => {
    const svg = makeSvg();
    const g = renderRadialRing(2, 2, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    }, svg);

    const paths = g.querySelectorAll("path.etch");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("creates group index labels", () => {
    const svg = makeSvg();
    const g = renderRadialRing(3, 2, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    }, svg);

    const texts = Array.from(g.querySelectorAll("text.indices:not(.small)"));
    const labels = texts.map((t) => t.textContent);
    expect(labels).toContain("B0");
    expect(labels).toContain("B1");
    expect(labels).toContain("B2");
  });

  it("creates slider paths with correct class", () => {
    const svg = makeSvg();
    const g = renderRadialRing(2, 3, rule, {
      radius: 300,
      layerIndex: 2,
      ringWidth: 100,
    }, svg);

    const topPaths = g.querySelectorAll("path.top.slider");
    expect(topPaths.length).toBe(6);
  });
});
