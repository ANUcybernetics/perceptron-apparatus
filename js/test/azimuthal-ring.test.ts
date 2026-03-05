import { describe, it, expect } from "vitest";
import { renderAzimuthalRing } from "../src/azimuthal-ring.js";
import { newRule } from "../src/utils.js";

function makeSvg(): SVGSVGElement {
  return document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
}

describe("renderAzimuthalRing", () => {
  const rule = newRule(0, 1, 0.1, 0.5);

  it("creates the correct number of slider groups", () => {
    const svg = makeSvg();
    const g = renderAzimuthalRing(6, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    }, svg);

    const sliders = g.querySelectorAll("[data-slider]");
    expect(sliders.length).toBe(6);
  });

  it("assigns correct data-slider attributes", () => {
    const svg = makeSvg();
    const g = renderAzimuthalRing(3, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    }, svg);

    const ids = Array.from(g.querySelectorAll("[data-slider]")).map((el) =>
      el.getAttribute("data-slider"),
    );
    expect(ids).toEqual(["A0", "A1", "A2"]);
  });

  it("uses correct layer letter for different layer indices", () => {
    const svg = makeSvg();
    const g = renderAzimuthalRing(2, rule, {
      radius: 400,
      layerIndex: 3,
      ringWidth: 10,
    }, svg);

    const ids = Array.from(g.querySelectorAll("[data-slider]")).map((el) =>
      el.getAttribute("data-slider"),
    );
    expect(ids).toEqual(["C0", "C1"]);
  });

  it("marks sliders as azimuthal type", () => {
    const svg = makeSvg();
    const g = renderAzimuthalRing(2, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    }, svg);

    const slider = g.querySelector("[data-slider]");
    expect(slider!.getAttribute("data-slider-type")).toBe("azimuthal");
  });

  it("creates arc paths for each slider", () => {
    const svg = makeSvg();
    const g = renderAzimuthalRing(4, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    }, svg);

    const paths = g.querySelectorAll("path.slider");
    expect(paths.length).toBe(4);
  });

  it("creates tick marks for rule values", () => {
    const svg = makeSvg();
    const g = renderAzimuthalRing(2, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    }, svg);

    const lines = g.querySelectorAll("line");
    expect(lines.length).toBe(rule.length * 2);
  });

  it("creates index labels", () => {
    const svg = makeSvg();
    const g = renderAzimuthalRing(3, rule, {
      radius: 400,
      layerIndex: 1,
      ringWidth: 10,
    }, svg);

    const texts = Array.from(g.querySelectorAll("text.indices"));
    const labels = texts.map((t) => t.textContent);
    expect(labels).toContain("A0");
    expect(labels).toContain("A1");
    expect(labels).toContain("A2");
  });
});
