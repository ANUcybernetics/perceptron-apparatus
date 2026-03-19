import { describe, it, expect } from "vitest";
import { renderBoard } from "../src/board.js";

function makeContainer(): HTMLDivElement {
  return document.createElement("div");
}

describe("renderBoard", () => {
  it("creates an SVG element", () => {
    const container = makeContainer();
    const svg = renderBoard(
      { nInput: 6, nHidden: 4, nOutput: 3 },
      container,
    );
    expect(svg.tagName).toBe("svg");
  });

  it("appends the SVG to the container", () => {
    const container = makeContainer();
    renderBoard({ nInput: 6, nHidden: 4, nOutput: 3 }, container);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("sets viewBox with default size", () => {
    const container = makeContainer();
    const svg = renderBoard(
      { nInput: 6, nHidden: 4, nOutput: 3 },
      container,
    );
    const viewBox = svg.getAttribute("viewBox");
    expect(viewBox).toContain("-610");
    expect(viewBox).toContain("1220");
  });

  it("sets viewBox with custom size", () => {
    const container = makeContainer();
    const svg = renderBoard(
      { size: 600, nInput: 2, nHidden: 2, nOutput: 2 },
      container,
    );
    const viewBox = svg.getAttribute("viewBox");
    expect(viewBox).toContain("-310");
    expect(viewBox).toContain("620");
  });

  it("contains a style element", () => {
    const container = makeContainer();
    const svg = renderBoard(
      { nInput: 2, nHidden: 2, nOutput: 2 },
      container,
    );
    expect(svg.querySelector("style")).not.toBeNull();
  });

  it("creates board edge circle", () => {
    const container = makeContainer();
    const svg = renderBoard(
      { nInput: 2, nHidden: 2, nOutput: 2 },
      container,
    );
    const edge = svg.querySelector("circle.full");
    expect(edge).not.toBeNull();
    expect(edge!.getAttribute("r")).toBe("600");
  });

  it("creates the log ring with data-ring attribute", () => {
    const container = makeContainer();
    const svg = renderBoard(
      { nInput: 2, nHidden: 2, nOutput: 2 },
      container,
    );
    const logRing = svg.querySelector("[data-ring='log']");
    expect(logRing).not.toBeNull();
    expect((logRing as HTMLElement).style.transform).toBe("rotate(4.2deg)");
  });

  it("creates azimuthal ring sliders", () => {
    const container = makeContainer();
    const svg = renderBoard(
      { nInput: 3, nHidden: 2, nOutput: 2 },
      container,
    );
    const inputSliders = svg.querySelectorAll(
      "[data-slider^='A'][data-slider-type='azimuthal']",
    );
    expect(inputSliders.length).toBe(3);
  });

  it("creates radial ring sliders", () => {
    const container = makeContainer();
    const svg = renderBoard(
      { nInput: 3, nHidden: 2, nOutput: 2 },
      container,
    );
    const weightSliders = svg.querySelectorAll(
      "[data-slider^='B'][data-slider-type='radial']",
    );
    expect(weightSliders.length).toBe(6);
  });

  it("creates all expected layer letters", () => {
    const container = makeContainer();
    const svg = renderBoard(
      { nInput: 2, nHidden: 2, nOutput: 2 },
      container,
    );

    expect(svg.querySelector("[data-slider^='A']")).not.toBeNull();
    expect(svg.querySelector("[data-slider^='B']")).not.toBeNull();
    expect(svg.querySelector("[data-slider^='C']")).not.toBeNull();
    expect(svg.querySelector("[data-slider^='D']")).not.toBeNull();
    expect(svg.querySelector("[data-slider^='E']")).not.toBeNull();
  });

  it("renders center logo text", () => {
    const container = makeContainer();
    const svg = renderBoard(
      { nInput: 2, nHidden: 2, nOutput: 2 },
      container,
    );
    const texts = Array.from(svg.querySelectorAll("text.logo")).map(
      (t) => t.textContent,
    );
    expect(texts).toContain("Cybernetic");
    expect(texts).toContain("Studio");
  });
});
